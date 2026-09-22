#!/usr/bin/env bash
# Materialize Cursor Cloud secrets into the files local scripts expect.
# Secrets themselves live in the Cloud Agents dashboard — never in git.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-start}"

write_ssh_key() {
  local raw="${HETZNER_SSH_PRIVATE_KEY:-}"
  [[ -z "$raw" ]] && return 0

  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"
  local key_file="$HOME/.ssh/id_ed25519_hetzner"
  local tmp
  tmp="$(mktemp)"

  # Cursor / GitHub may store PEM with real newlines, escaped \n, or base64.
  if [[ "$raw" != *"BEGIN "* ]]; then
    if printf '%s' "$raw" | base64 -d >"$tmp" 2>/dev/null && grep -q "BEGIN " "$tmp"; then
      :
    else
      printf '%s\n' "$raw" | sed 's/\\n/\n/g' >"$tmp"
    fi
  else
    printf '%s\n' "$raw" | sed 's/\\n/\n/g' >"$tmp"
  fi

  # Ensure trailing newline (OpenSSH requires it)
  python3 - "$tmp" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
t = p.read_text()
if not t.endswith("\n"):
    p.write_text(t + "\n")
PY

  install -m 600 "$tmp" "$key_file"
  install -m 600 "$tmp" "$HOME/.ssh/hetzner_deploy"
  rm -f "$tmp"

  local host="${HETZNER_HOST:-167.233.39.146}"
  if command -v ssh-keyscan >/dev/null 2>&1; then
    ssh-keyscan -H -T 8 "$host" >>"$HOME/.ssh/known_hosts" 2>/dev/null || true
  fi
}

upsert_dotenv() {
  python3 - "$ROOT" <<'PY'
import os, pathlib, sys

root = pathlib.Path(sys.argv[1])
example = root / ".env.development.example"
out = root / ".env.development"
if not out.exists() and example.exists():
    out.write_text(example.read_text())
elif not out.exists():
    out.write_text("")

keys = [
    "AMYNEST_ENV",
    "NODE_ENV",
    "PORT",
    "API_PUBLIC_URL",
    "DATABASE_URL",
    "REDIS_URL",
    "SESSION_SECRET",
    "OPENAI_API_KEY",
    "AI_INTEGRATIONS_OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "ELEVENLABS_API_KEY",
    "YOUBOT_API_KEY",
    "KIE_API_KEY",
    "AMYNEST_GEMINI_ENABLED",
    "AMYNEST_VEO_ENABLED",
    "AMYNEST_VEO_MODEL",
    "AMYNEST_PUBLISHING_PROVIDER",
    "AMYNEST_RENDERER",
    "AMYNEST_VIDEO_PROVIDER",
    "AMYNEST_KIE_ENABLED",
    "AMYNEST_KIE_VEO_MODEL",
    "AMYNEST_KIE_VEO_RESOLUTION",
    "YOUTUBE_CLIENT_ID",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
    "YOUTUBE_REDIRECT_URI",
    "YOUTUBE_DEFAULT_PRIVACY",
    "VITE_USE_LOCAL_API",
    "VITE_APP_API_ORIGIN",
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_VAPID_KEY",
    "VITE_REVENUECAT_IOS_API_KEY",
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_APP_ID",
    "FIREBASE_MESSAGING_SENDER_ID",
    "HETZNER_HOST",
    "REDIS_URL_EXTERNAL",
    "RENDER_API_KEY",
    "CLOUDFLARE_API_TOKEN",
]

# Dev defaults so API boot does not exit when secrets omit DATABASE_URL.
defaults = {
    "AMYNEST_ENV": "development",
    "NODE_ENV": "development",
    "PORT": "5000",
    "API_PUBLIC_URL": "http://localhost:5000",
    "VITE_USE_LOCAL_API": "1",
    "VITE_APP_API_ORIGIN": "http://localhost:5000",
    "DATABASE_URL": "postgresql://amynest:amynest@localhost:5432/amynest_dev",
    "SESSION_SECRET": "dev-phonics-session-secret-32chars-min!!",
    "HETZNER_HOST": "167.233.39.146",
}

lines = out.read_text().splitlines()
index = {}
for i, line in enumerate(lines):
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    index[s.split("=", 1)[0].strip()] = i

def quote(v: str) -> str:
    if any(c in v for c in ' \n\t#"\'') or v == "":
        return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return v

for key in keys:
    val = os.environ.get(key)
    if val is None or val == "":
        val = defaults.get(key)
    if val is None:
        continue
    rendered = f"{key}={quote(val)}"
    if key in index:
        lines[index[key]] = rendered
    else:
        lines.append(rendered)
        index[key] = len(lines) - 1

text = "\n".join(lines).rstrip() + "\n"
out.write_text(text)
print(f"[cloud-bootstrap] wrote {out} ({sum(1 for k in keys if os.environ.get(k))} secret keys from env)")
PY
}

write_ssh_key
upsert_dotenv

if [[ "$MODE" == "install" ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile || pnpm install
  else
    echo "[cloud-bootstrap] pnpm not on PATH yet — skip install"
  fi
  exit 0
fi

# start: bring up docker if present so postgres/redis profiles can run
if command -v docker >/dev/null 2>&1; then
  sudo service docker start >/dev/null 2>&1 || true
fi

echo "[cloud-bootstrap] ready. Hetzner: ssh -i ~/.ssh/id_ed25519_hetzner root@${HETZNER_HOST:-167.233.39.146}"
