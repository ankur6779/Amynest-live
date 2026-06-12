#!/bin/bash
# Phase A: probe all AppCore routes on production (HTTP status only; SPA shell = 200)
BASE="https://www.amynest.in"
OUT="/Users/macbook/AmyNestProject/AmyNest-AI/audit/final-cert/production-routes-probe.json"
echo '{"validatedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","baseURL":"'$BASE'","routes":[' > "$OUT"
first=1
routes=(
  "/" "/privacy" "/terms" "/support" "/get-app" "/guides" "/pricing"
  "/sign-in" "/sign-up" "/onboarding" "/dashboard" "/children" "/children/new"
  "/routines" "/routines/generate" "/behavior" "/parent-profile"
  "/notification-settings" "/assistant" "/amy-ai-tutor" "/learn-with-amy"
  "/progress" "/parenting-hub" "/parent-growth" "/debug/learning"
  "/phonics" "/phonics/test" "/life-skills" "/speech-coach" "/speech-coach/talk"
  "/speech-coach/live-session" "/talking-amy" "/kids-control-center"
  "/study" "/smart-math-tricks" "/abacus" "/spelling" "/olympiad"
  "/event-prep" "/school-morning-flow" "/amy-coach" "/amy-coach/progress"
  "/recipes" "/nutrition" "/audio-lessons" "/games" "/animal-world"
  "/discovery-worlds" "/answer-to-kids-how" "/worlds/animals" "/referrals"
  "/insights" "/rewards" "/environment" "/feedback"
  "/debug-parity" "/dev/phonics-audio-preview" "/dev/rhymes-audio-ab"
  "/admin/dashboard" "/admin/feedback" "/admin/audio-health"
)
for route in "${routes[@]}"; do
  code=$(/usr/bin/curl -s -o /dev/null -w "%{http_code}" --max-time 20 "${BASE}${route}")
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  printf '{"route":"%s","httpStatus":%s}' "$route" "$code" >> "$OUT"
done
echo '],"note":"SPA returns 200 for all routes; auth gating is client-side"}' >> "$OUT"
/bin/cat "$OUT" | /usr/bin/head -c 2000
