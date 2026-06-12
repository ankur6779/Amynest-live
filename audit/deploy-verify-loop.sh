#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MD="$ROOT/audit/deploy-verify-loop.md"
COMMIT_SHORT="04fcb1f9"
MAX_ATTEMPTS=6
SLEEP_SEC=120

append() { echo "$1" >> "$MD"; }

probe_meta() {
  curl -sS "https://www.amynest.in/" 2>/dev/null | rg -o 'name="amynest-deploy" content="[^"]+"' | sed 's/.*content="//;s/"$//' || echo "unknown"
}

probe_appcore() {
  node --input-type=module -e "
    const base='https://www.amynest.in';
    const html=await (await fetch(base+'/')).text();
    const m=html.match(/name=\"amynest-deploy\" content=\"([^\"]+)\"/);
    const deploy=m?.[1]??'';
    const main=html.match(/\/assets\/main-[^\"]+\.js/);
    let appCoreHash=null, devCount=0;
    if(main){
      const mainJs=await (await fetch(base+main[0])).text();
      const ac=mainJs.match(/AppCore-([A-Za-z0-9_-]+)/);
      if(ac){
        appCoreHash=ac[1];
        const js=await (await fetch(base+'/assets/AppCore-'+ac[1]+'.js')).text();
        devCount=(js.match(/DevRouteRedirect/g)||[]).length;
      }
    }
    console.log(JSON.stringify({deploy, appCoreHash, devRouteRedirect:devCount}));
  "
}

run_cert_if_live() {
  cd "$ROOT/artifacts/kidschedule"
  local results=()
  if pnpm exec playwright test --config=playwright.config.dev-routes.ts >/tmp/dev-routes.log 2>&1; then results+=("CHECK1:PASS"); else results+=("CHECK1:FAIL"); fi
  if STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' pnpm exec playwright test --config=playwright.config.phonics-probe.ts >/tmp/phonics.log 2>&1; then results+=("CHECK2:PASS"); else results+=("CHECK2:FAIL"); fi
  node playwright/run-deployment-cert-probe.mjs >/tmp/deploy-probe.log 2>&1 || true
  local count
  count=$(python3 -c "import json;print(json.load(open('$ROOT/audit/deployment-cert-probe.json'))['check5_build']['bundleAnalysis'].get('DevRouteRedirectCount',0))" 2>/dev/null || echo 0)
  if [ "$count" -gt 0 ]; then results+=("CHECK5:PASS"); else results+=("CHECK5:FAIL"); fi
  local rc
  rc=$(python3 -c "import json;d=json.load(open('$ROOT/lib/rhymes-audio/src/rhymes-gcs-registry.json'));print(d['count'])" )
  results+=("CHECK4_local_registry:$rc")
  echo "${results[*]}"
}

: > "$MD"
append "# Deploy verify loop"
append ""
append "- **Commit pushed:** \`$COMMIT_SHORT\` (main)"
append "- **Push:** https://github.com/ankur6779/Amynest-live/commit/$COMMIT_SHORT"
append "- **Render static site:** Amynest-live-1 (\`autoDeployTrigger: off\` in render.yaml — manual deploy may be required)"
append ""

attempt=1
live=0
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  meta=$(probe_meta)
  json=$(probe_appcore)
  hash=$(echo "$json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('appCoreHash') or 'n/a')")
  dev=$(echo "$json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('devRouteRedirect',0))")
  deploy=$(echo "$json" | python3 -c "import sys,json;print(json.load(sys.stdin).get('deploy',''))")

  append "## Attempt $attempt — $ts"
  append "- deploy meta: \`$deploy\` (html meta: \`$meta\`)"
  append "- AppCore hash: \`$hash\` (baseline old: \`Cdu12y8L\`)"
  append "- DevRouteRedirect in bundle: $dev"

  if [[ "$deploy" == *"$COMMIT_SHORT"* ]] || [[ "$meta" == *"$COMMIT_SHORT"* ]] || [[ "$hash" != "Cdu12y8L" && "$hash" != "n/a" && "$dev" -gt 0 ]]; then
    append "- **New deploy detected** — running certification probes"
    cert=$(run_cert_if_live)
    append "- Certification: $cert"
    live=1
    if echo "$cert" | rg -q 'CHECK1:PASS' && echo "$cert" | rg -q 'CHECK5:PASS'; then
      append "- **Overall:** PASS (dev routes + bundle)"
      break
    else
      append "- **Overall:** PARTIAL/FAIL — see logs in /tmp/*.log"
    fi
  else
    append "- **Result:** WAIT — production still on pre-fix bundle"
  fi
  append ""

  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then break; fi
  sleep "$SLEEP_SEC"
  attempt=$((attempt+1))
done

append "## Summary"
if [ "$live" -eq 0 ]; then
  append "- Deploy not live after $MAX_ATTEMPTS polls (~$((MAX_ATTEMPTS*SLEEP_SEC/60)) min)."
  append "- **User action:** Render Dashboard → **Amynest-live-1** → Manual Deploy (latest \`main\` @ $COMMIT_SHORT)."
  append "- Optional: deploy **Amynest-backend** for API rhyme registry 168."
else
  append "- Deploy reached production; see per-attempt certification lines above."
fi
