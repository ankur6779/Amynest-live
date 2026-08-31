#!/usr/bin/env bash
# Build a gitignored paste pack for Cursor Cloud Agents → Secrets.
# Does not print secret values. Re-run after local .env changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${CLOUD_SECRETS_OUT:-$ROOT/.cursor/cloud-secrets.local.env}"

python3 - "$ROOT" "$OUT" <<'PY'
import pathlib, sys

root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])

def parse(path: pathlib.Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        return data
    for line in path.read_text(errors="replace").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        v = v.strip().strip('"').strip("'")
        if v:
            data[k.strip()] = v
    return data

merged = {}
merged.update(parse(root / ".env"))
merged.update(parse(root / ".env.development"))

# Non-secret host used by hetzner scripts
merged.setdefault("HETZNER_HOST", "167.233.39.146")

# Unattended cloud SSH: passphrase-free GitHub Actions deploy key (already on the worker).
deploy = pathlib.Path.home() / ".ssh/id_ed25519_hetzner_deploy"
if deploy.exists():
    merged["HETZNER_SSH_PRIVATE_KEY"] = deploy.read_text().rstrip() + "\n"

# Runtime-secret keys first so the paste order matches dashboard practice
runtime = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "YOUBOT_API_KEY",
    "KIE_API_KEY",
    "YOUTUBE_CLIENT_SECRET",
    "YOUTUBE_REFRESH_TOKEN",
    "HETZNER_SSH_PRIVATE_KEY",
]
envish = [k for k in merged if k not in runtime]

out.parent.mkdir(parents=True, exist_ok=True)
chunks = [
    "# Paste into https://cursor.com/dashboard/cloud-agents → Secrets",
    "# Type: Runtime Secret for keys/tokens/SSH. Environment Variable for hosts/flags.",
    "# Do not commit this file.",
    "",
]
for key in runtime + sorted(envish):
    val = merged.get(key)
    if not val:
        continue
    if "\n" in val.rstrip("\n") or key.endswith("PRIVATE_KEY"):
        chunks.append(f"{key}<<AMYNEST_EOF")
        chunks.append(val.rstrip("\n"))
        chunks.append("AMYNEST_EOF")
        chunks.append("")
    else:
        chunks.append(f"{key}={val}")

out.write_text("\n".join(chunks).rstrip() + "\n")
print(f"Wrote {out}")
print("Keys:")
for key in runtime + sorted(envish):
    if merged.get(key):
        kind = "RUNTIME" if key in runtime else "ENV"
        print(f"  {kind:8} {key}")
PY
