#!/usr/bin/env bash
# Simulates the full ccpulse statusline sequence
R=$'\033[0m'; BOLD=$'\033[1m'; DIM=$'\033[2m'
RED=$'\033[31m'; YEL=$'\033[33m'; GRN=$'\033[32m'; CYN=$'\033[36m'; BLU=$'\033[34m'

show() {
  local s_pct=$1 w_pct=$2
  local s_fill=$(( s_pct * 10 / 100 ))
  local w_fill=$(( w_pct * 10 / 100 ))
  local s_bar="" w_bar=""
  for ((i=0; i<10; i++)); do
    [[ $i -lt $s_fill ]] && s_bar+="█" || s_bar+="░"
    [[ $i -lt $w_fill ]] && w_bar+="█" || w_bar+="░"
  done

  [[ $s_pct -ge 75 ]] && SC="$YEL" || SC="$GRN"
  [[ $w_pct -ge 75 ]] && WC="$YEL" || WC="$GRN"

  echo -e "${BOLD}${GRN}>${R}  ${CYN}my-project${R} ${BOLD}${BLU}git:(${RED}main${BLU})${R}  ${DIM}Claude Sonnet 4.6${R}"
  echo -e "   ${DIM}[MAX]${R}  S ${SC}${s_bar}${R} ${SC}${s_pct}%${R} ${DIM}14h left${R}   W ${WC}${w_bar}${R} ${WC}${w_pct}%${R}   ${DIM}~\$48.78/day${R}"
}

clear
show 11 38
sleep 3
clear
show 23 39
sleep 3
clear
show 35 41
