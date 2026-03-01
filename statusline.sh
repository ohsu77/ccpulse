#!/usr/bin/env bash
# Claude Code statusline — shows daily/weekly usage as bar graphs
# Install: copy to ~/.claude/statusline.sh && chmod +x ~/.claude/statusline.sh
# Config:  add to ~/.claude/settings.json:
#   { "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }

CACHE="$HOME/.claude-usage/cache.json"

bar() {
  local pct=$1
  local width=10
  local filled=$(( pct * width / 100 ))
  local empty=$(( width - filled ))
  local result=""
  for ((i=0; i<filled; i++)); do result+="█"; done
  for ((i=0; i<empty; i++));  do result+="░"; done
  echo "$result"
}

color() {
  local pct=$1
  if   (( pct >= 90 )); then echo -e "\033[31m"  # red
  elif (( pct >= 75 )); then echo -e "\033[33m"  # yellow
  elif (( pct >= 50 )); then echo -e "\033[32m"  # green
  else                       echo -e "\033[36m"  # cyan
  fi
}

RESET="\033[0m"

if [ ! -f "$CACHE" ]; then
  echo -e "\033[90m[claude-usage: no data]\033[0m"
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "[claude-usage: jq not found]"
  exit 0
fi

PLAN=$(jq -r '.plan // "unknown"' "$CACHE")
DAILY_COST=$(jq -r '.daily.costUSD // 0' "$CACHE")
WEEKLY_COST=$(jq -r '.weekly.costUSD // 0' "$CACHE")
DAILY_TOKENS=$(jq -r '(.daily.tokens.inputTokens // 0) + (.daily.tokens.outputTokens // 0)' "$CACHE")
WEEKLY_TOKENS=$(jq -r '(.weekly.tokens.inputTokens // 0) + (.weekly.tokens.outputTokens // 0)' "$CACHE")
FACTOR=$(jq -r '.calibrationFactor // "null"' "$CACHE")

# Calculate usage percentage
if [ "$FACTOR" != "null" ] && [ "$FACTOR" != "0" ]; then
  WEEKLY_PCT=$(echo "$WEEKLY_TOKENS $FACTOR" | awk '{v=$1*$2; if(v>100)v=100; printf "%d", v}')
  DAILY_PCT=$(echo "$DAILY_TOKENS $FACTOR" | awk '{v=$1*$2; if(v>100)v=100; printf "%d", v}')
  APPROX=""
else
  # No calibration yet — show tokens instead of %
  WEEKLY_PCT=0
  DAILY_PCT=0
  APPROX="~"
fi

DAILY_BAR=$(bar "$DAILY_PCT")
WEEKLY_BAR=$(bar "$WEEKLY_PCT")
DAILY_COLOR=$(color "$DAILY_PCT")
WEEKLY_COLOR=$(color "$WEEKLY_PCT")

PLAN_UPPER=$(echo "$PLAN" | tr '[:lower:]' '[:upper:]')

printf "${DAILY_COLOR}[${PLAN_UPPER}]${RESET} "
printf "D ${DAILY_COLOR}${DAILY_BAR}${RESET} ${APPROX}$(printf '%.4f' "$DAILY_COST")\$ "
printf "W ${WEEKLY_COLOR}${WEEKLY_BAR}${RESET} ${APPROX}$(printf '%.4f' "$WEEKLY_COST")\$"
printf "\n"
