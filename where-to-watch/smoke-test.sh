#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# End-to-end smoke test.
#
# Boots the dev server in MOCK mode, exercises every endpoint plus the static
# assets, asserts on the responses, and shuts the server down.
#
#   ./smoke-test.sh
#
# Exits non-zero if any check fails.
# ---------------------------------------------------------------------------
set -uo pipefail

unset NODE_OPTIONS http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy 2>/dev/null || true
export no_proxy='*' NO_PROXY='*'

PORT="${PORT:-3100}"
BASE="http://127.0.0.1:${PORT}"
LOG="$(mktemp)"
PASS=0
FAIL=0

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# --- boot -------------------------------------------------------------------
MOCK=1 \
AMAZON_ASSOCIATE_TAG=nostalgia90s-20 \
BEEHIIV_API_KEY=test-key \
BEEHIIV_PUBLICATION_ID=pub_test \
PORT="$PORT" \
  node dev-server.js > "$LOG" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 50); do
  curl -sf "${BASE}/api/settings" -o /dev/null 2>/dev/null && break
  sleep 0.2
done

if ! curl -sf "${BASE}/api/settings" -o /dev/null 2>/dev/null; then
  echo "FATAL: server never came up. Log:"
  cat "$LOG"
  exit 1
fi

echo "Server up on ${BASE} (pid ${SERVER_PID})"
echo

# --- helpers ----------------------------------------------------------------

# check <label> <url> <expected-http> [expected-substring]
check() {
  local label="$1" url="$2" want_code="$3" want_body="${4:-}"
  local body code
  body="$(curl -sS "$url" -w '\n%{http_code}' 2>&1)"
  code="$(tail -n1 <<<"$body")"
  body="$(sed '$d' <<<"$body")"

  if [[ "$code" != "$want_code" ]]; then
    echo "  FAIL  ${label} — expected HTTP ${want_code}, got ${code}"
    echo "        ${body:0:200}"
    ((FAIL++)); return
  fi
  if [[ -n "$want_body" && "$body" != *"$want_body"* ]]; then
    echo "  FAIL  ${label} — response missing '${want_body}'"
    echo "        ${body:0:300}"
    ((FAIL++)); return
  fi
  echo "  PASS  ${label} (${code})"
  ((PASS++))
}

# check_post <label> <url> <json> <expected-http> [expected-substring]
check_post() {
  local label="$1" url="$2" payload="$3" want_code="$4" want_body="${5:-}"
  local body code
  body="$(curl -sS -X POST "$url" -H 'Content-Type: application/json' -d "$payload" -w '\n%{http_code}' 2>&1)"
  code="$(tail -n1 <<<"$body")"
  body="$(sed '$d' <<<"$body")"

  if [[ "$code" != "$want_code" ]]; then
    echo "  FAIL  ${label} — expected HTTP ${want_code}, got ${code}"
    echo "        ${body:0:200}"
    ((FAIL++)); return
  fi
  if [[ -n "$want_body" && "$body" != *"$want_body"* ]]; then
    echo "  FAIL  ${label} — response missing '${want_body}'"
    echo "        ${body:0:300}"
    ((FAIL++)); return
  fi
  echo "  PASS  ${label} (${code})"
  ((PASS++))
}

# --- static assets ----------------------------------------------------------
echo "Static assets"
check "GET /"              "${BASE}/"            200 "Where can I watch it?"
check "GET / attribution"  "${BASE}/"            200 "not endorsed or certified by TMDB"
check "GET /styles.css"    "${BASE}/styles.css"  200 "--magenta"
check "GET /app.js"        "${BASE}/app.js"      200 "function esc"
check "GET /favicon.svg"   "${BASE}/favicon.svg" 200 "<svg"
check "GET /nope (404)"    "${BASE}/nope"        404 "404"
echo

# --- settings ---------------------------------------------------------------
echo "GET /api/settings"
check "configured"      "${BASE}/api/settings" 200 '"configured":true'
check "mock flag"       "${BASE}/api/settings" 200 '"mock":true'
check "affiliate on"    "${BASE}/api/settings" 200 '"affiliateEnabled":true'
check "email on"        "${BASE}/api/settings" 200 '"emailEnabled":true'
check "decades listed"  "${BASE}/api/settings" 200 '"key":"90s"'
echo

# --- search -----------------------------------------------------------------
echo "GET /api/search"
check "finds Hocus Pocus"     "${BASE}/api/search?q=hocus"                200 'Hocus Pocus'
check "case-insensitive"      "${BASE}/api/search?q=HOCUS"                200 'Hocus Pocus'
check "partial match"         "${BASE}/api/search?q=lion"                 200 'The Lion King'
check "type=tv filters"       "${BASE}/api/search?q=friends&type=tv"      200 'Friends'
check "type=movie excludes tv" "${BASE}/api/search?q=friends&type=movie"  200 '"results":[]'
check "decade 00s finds Shrek" "${BASE}/api/search?q=shrek&decade=00s"    200 'Shrek'
check "decade 90s excludes Shrek" "${BASE}/api/search?q=shrek&decade=90s" 200 '"results":[]'
check "decade all finds Shrek" "${BASE}/api/search?q=shrek&decade=all"    200 'Shrek'
check "missing q -> 400"      "${BASE}/api/search"                        400 'search term'
check "no match -> empty"     "${BASE}/api/search?q=zzzzzznope"           200 '"results":[]'
echo

# --- discover ---------------------------------------------------------------
echo "GET /api/discover"
check "90s movies"      "${BASE}/api/discover?type=movie&decade=90s" 200 'Jurassic Park'
check "90s tv"          "${BASE}/api/discover?type=tv&decade=90s"    200 'Rugrats'
check "00s movies"      "${BASE}/api/discover?type=movie&decade=00s" 200 'Mean Girls'
check "no 00s in 90s"   "${BASE}/api/discover?type=movie&decade=90s" 200 'Home Alone'
echo

# --- title ------------------------------------------------------------------
echo "GET /api/title"
check "movie detail"        "${BASE}/api/title?type=movie&id=771" 200 'Home Alone'
check "providers present"   "${BASE}/api/title?type=movie&id=771" 200 '"stream"'
check "provider name"       "${BASE}/api/title?type=movie&id=771" 200 'Disney Plus'
check "available flag"      "${BASE}/api/title?type=movie&id=771" 200 '"available":true'
check "justwatch link"      "${BASE}/api/title?type=movie&id=771" 200 'justwatch.com'
check "amazon tag injected" "${BASE}/api/title?type=movie&id=771" 200 'tag=nostalgia90s-20'
check "amazon dept scoped"  "${BASE}/api/title?type=movie&id=771" 200 'i=movies-tv'
check "tv detail + seasons" "${BASE}/api/title?type=tv&id=1668"    200 '"seasons":10'
check "region echoed"       "${BASE}/api/title?type=movie&id=771&region=GB" 200 '"region":"GB"'
check "amazon uk domain"    "${BASE}/api/title?type=movie&id=771&region=GB" 200 'amazon.co.uk'
check "bad id -> 400"       "${BASE}/api/title?type=movie&id=abc"  400 'numeric'
check "unknown id -> 404"   "${BASE}/api/title?type=movie&id=999999" 404 'could not find'
echo

# --- random -----------------------------------------------------------------
echo "GET /api/random"
check "returns a title"  "${BASE}/api/random?decade=90s&type=movie" 200 '"providers"'
check "has amazon link"  "${BASE}/api/random?decade=90s&type=movie" 200 'tag=nostalgia90s-20'
echo

# --- subscribe --------------------------------------------------------------
echo "POST /api/subscribe"
check_post "valid email"      "${BASE}/api/subscribe" '{"email":"fan@example.com"}' 200 '"ok":true'
check_post "invalid email"    "${BASE}/api/subscribe" '{"email":"notanemail"}'      400 'valid email'
check_post "empty email"      "${BASE}/api/subscribe" '{"email":""}'                400 'valid email'
check "GET rejected (405)"    "${BASE}/api/subscribe" 405 'not allowed'
echo

# --- routing / hardening ----------------------------------------------------
echo "Routing + hardening"
check "unknown api route"   "${BASE}/api/nope"            404 'No API route'
check "_lib not reachable"  "${BASE}/api/_lib"            404 'Unknown API route'
check "traversal blocked"   "${BASE}/api/../package.json" 404 ''
echo

# --- summary ----------------------------------------------------------------
echo "==========================================="
echo "  PASSED: ${PASS}    FAILED: ${FAIL}"
echo "==========================================="

if [[ -s "$LOG" ]]; then
  echo
  echo "Server log:"
  sed 's/^/  /' "$LOG"
fi

[[ "$FAIL" -eq 0 ]]
