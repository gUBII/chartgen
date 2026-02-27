#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <handshake_log_path> <uuid>" >&2
  exit 64
fi

log_file="$1"
uuid="$2"

if [[ ! -f "$log_file" ]]; then
  echo "MISSING_LOG file=$log_file"
  exit 66
fi

start_line="$(rg -n "^RESULT \\[$uuid\\]" "$log_file" | tail -n 1 | cut -d: -f1 || true)"
if [[ -z "$start_line" ]]; then
  echo "MISSING_RESULT uuid=$uuid"
  exit 2
fi

end_line="$((start_line + 40))"
result_block="$(sed -n "${start_line},${end_line}p" "$log_file" | awk 'NR==1{print; next} /^INSTRUCTION \[/ {exit} {print}')"

if [[ -z "$result_block" ]]; then
  echo "MISSING_RESULT_BLOCK uuid=$uuid line=$start_line"
  exit 2
fi

if printf '%s\n' "$result_block" | rg -q '<[^>]+>|PASS\|FAIL\|BLOCKED|Status:[[:space:]]*PASS\|FAIL|yes\|no|<n>|<code>'; then
  echo "NON_COMPLIANT uuid=$uuid line=$start_line"
  echo "$result_block"
  exit 1
fi

# Reject contradictory outputs where PASS is paired with explicit unsafe signals.
if printf '%s\n' "$result_block" | rg -q '(^RESULT \[[^]]+\][[:space:]]+PASS|^Status:[[:space:]]*PASS)'; then
  if printf '%s\n' "$result_block" | rg -q 'append_as_is=UNSAFE|AppendAsIs:[[:space:]]*UNSAFE|cp_safe_now=no|CpSafeNow:[[:space:]]*no|collisions=[1-9][0-9]*|CollisionCount:[[:space:]]*[1-9][0-9]*'; then
    echo "SAFETY_CONTRADICTION uuid=$uuid line=$start_line"
    echo "$result_block"
    exit 1
  fi
fi

echo "COMPLIANT uuid=$uuid line=$start_line"
echo "$result_block" | head -n 1
