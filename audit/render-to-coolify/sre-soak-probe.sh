#!/usr/bin/env bash
# SRE controlled soak — read-only probes every 30s for 60 minutes. Canary stays at 0%.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/audit/render-to-coolify/sre-soak-probe.jsonl"
SUMMARY="$ROOT/audit/render-to-coolify/sre-soak-summary.json"
COOLIFY="${COOLIFY_API_URL:-https://ik6ml2uhw6op765lo14wn5m3.188.245.208.126.sslip.io}"
DURATION_SEC="${SRE_SOAK_DURATION_SEC:-3600}"
INTERVAL_SEC="${SRE_SOAK_INTERVAL_SEC:-30}"
END=$(( $(date +%s) + DURATION_SEC ))
TOTAL=0
FAIL=0
echo "{\"started_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"duration_sec\":$DURATION_SEC,\"interval_sec\":$INTERVAL_SEC}" > "$SUMMARY.meta"
: > "$OUT"
while [ "$(date +%s)" -lt "$END" ]; do
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  H=$(curl -sS -m 20 -o /dev/null -w "%{http_code}:%{time_total}:%{ssl_verify_result}" "$COOLIFY/health" 2>/dev/null || echo "ERR:0:0")
  Z=$(curl -sS -m 20 -o /dev/null -w "%{http_code}:%{time_total}" "$COOLIFY/api/healthz" 2>/dev/null || echo "ERR:0")
  IFS=: read -r H_CODE H_TIME H_SSL <<< "$H"
  IFS=: read -r Z_CODE Z_TIME <<< "$Z"
  OK=true
  if [[ "$H_CODE" != "200" || "$Z_CODE" != "200" ]]; then OK=false; FAIL=$((FAIL+1)); fi
  TOTAL=$((TOTAL+1))
  printf '{"at":"%s","health":{"code":"%s","ms":%s,"ssl":%s},"healthz":{"code":"%s","ms":%s},"ok":%s}\n' \
    "$TS" "$H_CODE" "${H_TIME:-0}" "${H_SSL:-0}" "$Z_CODE" "${Z_TIME:-0}" "$OK" >> "$OUT"
  sleep "$INTERVAL_SEC"
done
PASS=$((TOTAL - FAIL))
python3 - <<PY
import json, pathlib, statistics
out = pathlib.Path("$OUT")
lines = [json.loads(l) for l in out.read_text().splitlines() if l.strip()]
health_ms = [float(x["health"]["ms"]) for x in lines if x["health"]["code"]=="200"]
healthz_ms = [float(x["healthz"]["ms"]) for x in lines if x["healthz"]["code"]=="200"]
def pct(v,p):
    if not v: return 0
    s=sorted(v); return s[int(len(s)*p)]
summary = {
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_probes": len(lines),
  "failed_probes": sum(1 for x in lines if not x["ok"]),
  "pass_rate": round(100*(1 - sum(1 for x in lines if not x["ok"])/max(1,len(lines))), 2),
  "health_latency_ms": {"p50": pct(health_ms,0.5), "p95": pct(health_ms,0.95), "max": max(health_ms) if health_ms else 0},
  "healthz_latency_ms": {"p50": pct(healthz_ms,0.5), "p95": pct(healthz_ms,0.95), "max": max(healthz_ms) if healthz_ms else 0},
}
pathlib.Path("$SUMMARY").write_text(json.dumps(summary, indent=2)+"\n")
print(json.dumps(summary))
PY
