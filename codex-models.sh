#!/usr/bin/env bash
set -euo pipefail

AUTH_JSON="${CODEX_HOME:-$HOME/.codex}/auth.json"

ACCESS_TOKEN="$(jq -r '.tokens.access_token // empty' "$AUTH_JSON")"
ACCOUNT_ID="$(jq -r '.tokens.account_id // .tokens.id_token.chatgpt_account_id // empty' "$AUTH_JSON")"

CLIENT_VERSION="$(
  codex --version 2>/dev/null \
    | grep -Eo '[0-9]+(\.[0-9]+){1,3}(-[A-Za-z0-9._-]+)?' \
    | head -n1
)"
CLIENT_VERSION="${CLIENT_VERSION:-0.99.0}"

curl -sS \
  "https://chatgpt.com/backend-api/codex/models?client_version=${CLIENT_VERSION}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "ChatGPT-Account-ID: $ACCOUNT_ID" \
  -H "User-Agent: codex-cli" \
  | jq
