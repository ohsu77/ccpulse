#!/usr/bin/env bash
# Claude Code status line — robbyrussell theme + claude usage
# Reads JSON from stdin and outputs a styled status line
#
# Install:
#   cp statusline.sh ~/.claude/statusline-command.sh
#   chmod +x ~/.claude/statusline-command.sh
#
# Configure ~/.claude/settings.json:
#   { "statusLine": { "type": "command", "command": "~/.claude/statusline-command.sh" } }
#
# Note: Update REFRESH_SCRIPT path to match your install location.

R=$'\033[0m'
BOLD=$'\033[1m'
DIM=$'\033[2m'
RED=$'\033[31m'
YEL=$'\033[33m'
GRN=$'\033[32m'
CYN=$'\033[36m'
BLU=$'\033[34m'

input=$(cat)

# Current working directory (basename only)
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
dir=$(basename "$cwd")

# Git branch
branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)

if [ -n "$branch" ]; then
  if git -C "$cwd" --no-optional-locks status --porcelain 2>/dev/null | grep -q .; then
    git_dirty="${YEL}✗${R}"
  else
    git_dirty=""
  fi
  git_info=" ${BOLD}${BLU}git:(${RED}${branch}${BLU})${R}${git_dirty}"
else
  git_info=""
fi

# Context window usage
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -n "$used" ]; then
  used_int=$(printf "%.0f" "$used")
  ctx_info=" ${DIM}[ctx:${used_int}%]${R}"
else
  ctx_info=""
fi

# Model name
model=$(echo "$input" | jq -r '.model.display_name // ""')

# Line 1: directory + git + ctx + model
printf "${BOLD}${GRN}➜${R}  ${CYN}%s${R}%s%s  ${DIM}%s${R}\n" \
  "$dir" "$git_info" "$ctx_info" "$model"

# ── Claude Usage ──────────────────────────────────────────────────────────
CACHE="$HOME/.claude-usage/cache.json"
# Update this path to wherever you cloned claude-usage-mcp
REFRESH_SCRIPT="$HOME/projects/claude-usage-mcp/dist/refresh.js"

bar() {
  local pct=$1 width=10 filled empty result=""
  filled=$(( pct * width / 100 ))
  empty=$(( width - filled ))
  for ((i=0; i<filled; i++)); do result+="█"; done
  for ((i=0; i<empty;  i++)); do result+="░"; done
  printf "%s" "$result"
}

usage_color() {
  local pct=$1
  if   (( pct >= 90 )); then printf "%s" "$RED"
  elif (( pct >= 75 )); then printf "%s" "$YEL"
  elif (( pct >= 50 )); then printf "%s" "$GRN"
  else                       printf "%s" "$CYN"
  fi
}

# Auto-refresh cache if stale (> 30 seconds old)
if [ -f "$CACHE" ] && [ -f "$REFRESH_SCRIPT" ]; then
  CACHE_AGE=$(( $(date +%s) - $(stat -f %m "$CACHE" 2>/dev/null || echo 0) ))
  if (( CACHE_AGE > 30 )); then
    node "$REFRESH_SCRIPT" >/dev/null 2>&1 &
    disown 2>/dev/null || true
  fi
fi

if [ -f "$CACHE" ] && command -v jq &>/dev/null; then
  PLAN=$(jq -r '.plan // "?"' "$CACHE" | tr '[:lower:]' '[:upper:]')
  D_COST=$(jq -r '.daily.costUSD // 0' "$CACHE")

  # OAuth API 값 우선 — 없으면 로컬 추정치
  OAUTH_SRC=$(jq -r '.oauth.source // "none"' "$CACHE")
  S_PCT=$(jq -r '.oauth.sessionPct // 0' "$CACHE" | awk '{printf "%d", $1}')
  W_PCT=$(jq -r '.oauth.weeklyPct  // 0' "$CACHE" | awk '{printf "%d", $1}')
  S_RESETS=$(jq -r '.oauth.sessionResetsAt // ""' "$CACHE")

  # 리셋까지 남은 시간 계산 (UTC 파싱 필수)
  if [ -n "$S_RESETS" ] && [ "$S_RESETS" != "null" ]; then
    NOW_S=$(date +%s)
    RESET_S=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "${S_RESETS%%.*}" "+%s" 2>/dev/null \
              || date -d "${S_RESETS}" "+%s" 2>/dev/null || echo 0)
    DIFF_SEC=$(( RESET_S - NOW_S ))
    if (( DIFF_SEC > 3600 )); then
      RESETS_STR="↻$((DIFF_SEC/3600))h$(( (DIFF_SEC%3600)/60 ))m"
    elif (( DIFF_SEC > 0 )); then
      RESETS_STR="↻$((DIFF_SEC/60))m"
    else
      RESETS_STR=""
    fi
  else
    RESETS_STR=""
  fi

  # API 없으면 로컬 추정
  if [ "$OAUTH_SRC" = "none" ] || [ "$OAUTH_SRC" = "null" ]; then
    FACTOR=$(jq -r '.calibrationFactor // "null"' "$CACHE")
    W_TOK=$(jq -r '(.weekly.tokens.inputTokens//0)+(.weekly.tokens.outputTokens//0)' "$CACHE")
    if [ "$FACTOR" != "null" ] && [ "$FACTOR" != "0" ]; then
      W_PCT=$(echo "$W_TOK $FACTOR" | awk '{v=$1*$2; if(v>100)v=100; printf "%d",v}')
    fi
    S_PCT=0
    APPROX="~"
  else
    APPROX=""
  fi

  SC=$(usage_color $S_PCT)
  WC=$(usage_color $W_PCT)
  D_COST_FMT=$(printf '%.2f' "$D_COST")

  # Line 2: S(ession) + W(eekly) + daily cost
  printf "%s" "   ${DIM}[${PLAN}]${R}"
  printf "%s" "  S ${SC}$(bar $S_PCT)${R} ${SC}${APPROX}${S_PCT}%${R}"
  [ -n "$RESETS_STR" ] && printf "%s" " ${DIM}${RESETS_STR}${R}"
  printf "%s" "  W ${WC}$(bar $W_PCT)${R} ${WC}${APPROX}${W_PCT}%${R}"
  printf "%s" "  ${DIM}~\$${D_COST_FMT}${R}"
  printf "\n"
fi
