#!/usr/bin/env python3
"""Rotate GCP service account keys via IAM API. Secrets written to /tmp only."""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "Amynest-backend-dykj.env"
OUT_DIR = Path("/tmp/amynest-key-rotation")
STATE_FILE = OUT_DIR / "rotation-state.json"

LEAKED_KEY_IDS = [
    ("leaked-git-1", "firebase-adminsdk-fbsvc@amynest-836ff.iam.gserviceaccount.com", "8bbf2dc0d431e66dee3cec34605debae0c852a5c"),
    ("leaked-git-2", "firebase-adminsdk-fbsvc@amynest-836ff.iam.gserviceaccount.com", "b8d1f279e14e883809ddd8f6ffbeba8b725b8bda"),
]


def parse_env_json(text: str, key: str) -> dict | None:
    line = next((l for l in text.splitlines() if l.startswith(f"{key}=")), None)
    if not line:
        return None
    val = line.split("=", 1)[1].strip()
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        val = val[1:-1]
    val = val.replace("\\n", "\n").replace('\\"', '"')
    try:
        return json.loads(val)
    except json.JSONDecodeError:
        return None


def jwt_for_sa(creds: dict) -> str:
    import time

    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding

    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b"=").decode()
    now = int(time.time())
    claim = {
        "iss": creds["client_email"],
        "sub": creds["client_email"],
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
        "scope": "https://www.googleapis.com/auth/cloud-platform",
    }
    payload = base64.urlsafe_b64encode(json.dumps(claim).encode()).rstrip(b"=").decode()
    signing_input = f"{header}.{payload}".encode()
    key = serialization.load_pem_private_key(creds["private_key"].encode(), password=None)
    sig = base64.urlsafe_b64encode(
        key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    ).rstrip(b"=").decode()
    jwt = f"{header}.{payload}.{sig}"

    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=urllib.parse.urlencode(
            {"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": jwt}
        ).encode(),
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())["access_token"]


def api_post(token: str, url: str, body: dict | None = None) -> dict:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def api_delete(token: str, url: str) -> None:
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {token}"},
        method="DELETE",
    )
    with urllib.request.urlopen(req, timeout=60):
        pass


def create_key(token: str, creds: dict) -> dict:
    email = creds["client_email"]
    project = creds.get("project_id", "amynest-836ff")
    url = f"https://iam.googleapis.com/v1/projects/{project}/serviceAccounts/{email}/keys"
    resp = api_post(token, url, {})
    return json.loads(base64.b64decode(resp["privateKeyData"]))


def revoke_key(token: str, project: str, email: str, key_id: str) -> None:
    name = f"projects/{project}/serviceAccounts/{email}/keys/{key_id}"
    api_delete(token, f"https://iam.googleapis.com/v1/{name}")


def load_auth_creds(prefer: dict | None = None) -> dict:
    if prefer:
        return prefer
    if not ENV_FILE.exists():
        raise SystemExit(f"Missing {ENV_FILE}")
    text = ENV_FILE.read_text()
    firebase = parse_env_json(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    gcs = parse_env_json(text, "GCS_SERVICE_ACCOUNT_JSON") or parse_env_json(
        text, "GCS_SERVICE_ACCOUNT_JSON_B64"
    )
    creds = firebase or gcs
    if not creds:
        raise SystemExit("No service account JSON in env file")
    return creds


def cmd_create() -> int:
    text = ENV_FILE.read_text()
    firebase = parse_env_json(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    gcs = parse_env_json(text, "GCS_SERVICE_ACCOUNT_JSON") or parse_env_json(
        text, "GCS_SERVICE_ACCOUNT_JSON_B64"
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    state: dict = {"old_key_ids": [], "new_key_ids": [], "paths": {}}

    pairs: list[tuple[str, dict]] = []
    if firebase:
        pairs.append(("firebase", firebase))
    if gcs and (not firebase or gcs["client_email"] != firebase["client_email"]):
        pairs.append(("gcs", gcs))

    new_json_by_label: dict[str, dict] = {}
    for label, old in pairs:
        state["old_key_ids"].append(
            {"label": label, "email": old["client_email"], "key_id": old["private_key_id"]}
        )
        token = jwt_for_sa(load_auth_creds(old))
        new_key = create_key(token, old)
        new_json_by_label[label] = new_key
        path = OUT_DIR / f"{label}-service-account.json"
        path.write_text(json.dumps(new_key, indent=2))
        os.chmod(path, 0o600)
        state["paths"][label] = str(path)
        state["new_key_ids"].append(
            {"label": label, "email": new_key["client_email"], "key_id": new_key["private_key_id"]}
        )
        print(f"Created {label}: {new_key['private_key_id']} -> {path}")

    STATE_FILE.write_text(json.dumps(state, indent=2))
    print("NEW_KEYS_JSON=" + json.dumps(new_json_by_label))
    return 0


def cmd_revoke() -> int:
    state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {"old_key_ids": []}
    new_ids = {x["key_id"] for x in state.get("new_key_ids", [])}

    targets = [(x["label"], x["email"], x["key_id"]) for x in state.get("old_key_ids", [])]
    targets.extend(LEAKED_KEY_IDS)

    seen: set[str] = set()
    errors = 0
    for label, email, kid in targets:
        if kid in seen or kid in new_ids:
            continue
        seen.add(kid)
        try:
            token = jwt_for_sa(load_auth_creds())
            revoke_key(token, "amynest-836ff", email, kid)
            print(f"Revoked {label}: {kid}")
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            if e.code == 404:
                print(f"Already revoked/missing {label}: {kid}")
            else:
                print(f"FAILED revoke {label} {kid}: {e.code} {body}", file=sys.stderr)
                errors += 1
    return errors


def cmd_import(from_dir: Path | None = None) -> int:
    src = from_dir or Path("/tmp/amynest-key-rotation/inbox")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = ENV_FILE.read_text()
    firebase_old = parse_env_json(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    gcs_old = parse_env_json(text, "GCS_SERVICE_ACCOUNT_JSON")

    candidates = list(src.glob("*.json")) if src.is_dir() else []
    if not candidates:
        print(f"No JSON files in {src}", file=sys.stderr)
        return 1

    by_email: dict[str, Path] = {}
    for path in candidates:
        try:
            data = json.loads(path.read_text())
            email = data.get("client_email")
            if email and data.get("private_key"):
                by_email[email] = path
        except json.JSONDecodeError:
            continue

    mapping = {
        "firebase-adminsdk-fbsvc@amynest-836ff.iam.gserviceaccount.com": "firebase",
        "amynest-storage@amynest-836ff.iam.gserviceaccount.com": "gcs",
    }
    state: dict = {"old_key_ids": [], "new_key_ids": [], "paths": {}}
    imported = 0
    for email, label in mapping.items():
        src_path = by_email.get(email)
        if not src_path:
            print(f"Missing key file for {email}", file=sys.stderr)
            continue
        old = firebase_old if label == "firebase" else gcs_old
        if old:
            state["old_key_ids"].append(
                {"label": label, "email": email, "key_id": old["private_key_id"]}
            )
        data = json.loads(src_path.read_text())
        if old and data.get("private_key_id") == old.get("private_key_id"):
            print(f"WARN: {label} key id unchanged — download a NEW key from GCP Console", file=sys.stderr)
        dest = OUT_DIR / f"{label}-service-account.json"
        dest.write_text(json.dumps(data, indent=2))
        os.chmod(dest, 0o600)
        state["paths"][label] = str(dest)
        state["new_key_ids"].append(
            {"label": label, "email": email, "key_id": data["private_key_id"]}
        )
        print(f"Imported {label}: {data['private_key_id']} -> {dest}")
        imported += 1

    if imported == 0:
        return 1
    STATE_FILE.write_text(json.dumps(state, indent=2))
    return 0


def cmd_create_gcloud() -> int:
    import subprocess

    gcloud = "/usr/local/share/google-cloud-sdk/bin/gcloud"
    if not Path(gcloud).exists():
        gcloud = "gcloud"
    text = ENV_FILE.read_text()
    firebase = parse_env_json(text, "FIREBASE_SERVICE_ACCOUNT_JSON")
    gcs = parse_env_json(text, "GCS_SERVICE_ACCOUNT_JSON")
    if not firebase or not gcs:
        raise SystemExit("Could not parse service account JSON from env file")

    accounts = [
        ("firebase", firebase["client_email"]),
        ("gcs", gcs["client_email"]),
    ]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    state: dict = {"old_key_ids": [], "new_key_ids": [], "paths": {}}

    active = subprocess.run([gcloud, "auth", "list", "--filter=status:ACTIVE", "--format=value(account)"], capture_output=True, text=True)
    acct = active.stdout.strip().split("\n")[0] if active.stdout.strip() else ""
    if acct.endswith(".iam.gserviceaccount.com"):
        print("Run `gcloud auth login` as your Google owner account first (not a service account).", file=sys.stderr)
        return 1

    for label, old in [("firebase", firebase), ("gcs", gcs)]:
        if label == "gcs" and old["client_email"] == firebase["client_email"]:
            continue
        state["old_key_ids"].append(
            {"label": label, "email": old["client_email"], "key_id": old["private_key_id"]}
        )
        out = OUT_DIR / f"{label}-service-account.json"
        rc = subprocess.run(
            [gcloud, "iam", "service-accounts", "keys", "create", str(out),
             "--iam-account", old["client_email"], "--project", "amynest-836ff"],
            capture_output=True, text=True,
        )
        if rc.returncode != 0:
            print(f"FAILED {label}: {rc.stderr}", file=sys.stderr)
            return 1
        data = json.loads(out.read_text())
        os.chmod(out, 0o600)
        state["paths"][label] = str(out)
        state["new_key_ids"].append(
            {"label": label, "email": data["client_email"], "key_id": data["private_key_id"]}
        )
        print(f"Created {label}: {data['private_key_id']} -> {out}")

    STATE_FILE.write_text(json.dumps(state, indent=2))
    return 0


def cmd_render_update() -> int:
    if not STATE_FILE.exists():
        print("Run `create` first — no rotation state at", STATE_FILE, file=sys.stderr)
        return 1
    api_key = os.environ.get("RENDER_API_KEY", "").strip()
    if not api_key:
        print("Set RENDER_API_KEY (Render Dashboard → Account → API Keys)", file=sys.stderr)
        return 1

    state = json.loads(STATE_FILE.read_text())
    env_updates: list[tuple[str, str]] = []
    for label in ("firebase", "gcs"):
        path = state.get("paths", {}).get(label)
        if path and Path(path).exists():
            key_name = (
                "FIREBASE_SERVICE_ACCOUNT_JSON"
                if label == "firebase"
                else "GCS_SERVICE_ACCOUNT_JSON"
            )
            env_updates.append((key_name, Path(path).read_text().strip()))

    if not env_updates:
        print("No new key files found under", OUT_DIR, file=sys.stderr)
        return 1

    service_ids = [
        "srv-d85k8jbtqb8s7382mjng",  # Amynest-backend-dykj
        "srv-d85k8jbtqb8s7382mjog",  # amynest-ai-worker-dykj
    ]

    for service_id in service_ids:
        body = json.dumps(
            [{"key": k, "value": v} for k, v in env_updates]
        ).encode()
        req = urllib.request.Request(
            f"https://api.render.com/v1/services/{service_id}/env-vars",
            data=body,
            method="PUT",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                print(f"Updated env on {service_id}: HTTP {resp.status}")
        except urllib.error.HTTPError as e:
            print(f"FAILED {service_id}: {e.code} {e.read().decode()}", file=sys.stderr)
            return 1

    print("Env updated. Trigger redeploy: bash scripts/trigger-render-deploy.sh")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "phase",
        choices=["create", "create-gcloud", "import", "revoke", "render-update"],
    )
    parser.add_argument("--from-dir", type=Path, default=None, help="Import JSON keys from directory")
    args = parser.parse_args()
    try:
        import cryptography  # noqa: F401
    except ImportError:
        print("Install: pip3 install --break-system-packages cryptography", file=sys.stderr)
        return 1
    if args.phase == "create":
        return cmd_create()
    if args.phase == "create-gcloud":
        return cmd_create_gcloud()
    if args.phase == "import":
        return cmd_import(args.from_dir)
    if args.phase == "render-update":
        return cmd_render_update()
    return cmd_revoke()


if __name__ == "__main__":
    raise SystemExit(main())
