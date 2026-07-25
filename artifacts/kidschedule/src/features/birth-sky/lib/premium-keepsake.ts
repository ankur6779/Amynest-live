/**
 * Client-only Amy Astro Intelligence Keepsake — Signature Edition print.
 * No API changes.
 */

export type KeepsakeInput = {
  parentName: string;
  childName: string;
  birthDate: string;
  sunSign: string;
  moonSign: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  essenceLine: string;
  daySky: boolean;
  signatureParagraph: string;
  signatureSentence: string;
  qualities: string[];
  parentingReminders: string[];
  amyReflection: string;
};

export type KeepsakeOpenResult = "printed" | "downloaded" | "failed";

export function openPremiumKeepsakePrint(input: KeepsakeInput): KeepsakeOpenResult {
  const rising = input.risingSign && !input.daySky ? input.risingSign : "Day Sky · Rising waits";
  const signatureHtml = escapeHtml(input.signatureParagraph).replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
  const qualities = input.qualities.map((q) => `<li>${escapeHtml(q)}</li>`).join("");
  const reminders = input.parentingReminders.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(input.childName)} · Amy Astro Intelligence Keepsake</title>
<style>
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Iowan Old Style", Palatino, Georgia, serif;
    color: #f4efe6; background: #070b16;
  }
  .page {
    min-height: 100vh; padding: 44px 36px; page-break-after: always;
    background:
      radial-gradient(ellipse 70% 50% at 50% 16%, rgba(120,70,180,.4), transparent 55%),
      radial-gradient(ellipse 50% 40% at 84% 74%, rgba(40,70,140,.34), transparent 50%),
      radial-gradient(ellipse 40% 30% at 10% 82%, rgba(200,150,60,.14), transparent 45%),
      #070b16;
    position: relative;
  }
  .page:last-child { page-break-after: auto; }
  .stars {
    position: absolute; inset: 0; pointer-events: none; opacity: .55;
    background-image:
      radial-gradient(1px 1px at 12% 18%, rgba(255,240,210,.85), transparent),
      radial-gradient(1px 1px at 44% 12%, rgba(255,220,150,.9), transparent),
      radial-gradient(1px 1px at 78% 28%, rgba(255,240,210,.6), transparent),
      radial-gradient(1.5px 1.5px at 62% 70%, rgba(255,220,160,.7), transparent),
      radial-gradient(1px 1px at 22% 78%, rgba(255,240,210,.5), transparent);
  }
  .inner { position: relative; z-index: 1; }
  .eyebrow { letter-spacing: .28em; text-transform: uppercase; font-size: 11px; color: #d4b56a; }
  h1 { font-weight: 600; font-size: 38px; margin: 12px 0 8px; line-height: 1.15;
    background: linear-gradient(135deg,#f0d78a,#c9a24a 45%,#f5efe0 70%,#e0c06a);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  h2 { margin: 0 0 10px; font-size: 20px; color: #e8c97a; font-weight: 600; }
  .tag { color: rgba(244,239,230,.55); font-size: 12px; letter-spacing: .18em; text-transform: uppercase; }
  .card {
    margin-top: 20px; padding: 22px 24px; border-radius: 20px;
    border: 1px solid rgba(212,181,106,.28);
    background: linear-gradient(165deg, rgba(30,36,60,.78), rgba(20,18,40,.58));
  }
  .card p { margin: 0; line-height: 1.65; color: rgba(244,239,230,.88); font-size: 14px; }
  .card p + p { margin-top: 12px; }
  .sig { font-size: 17px; line-height: 1.7; color: #f0e6c8; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
  .planet { text-align: center; }
  .planet .glyph { font-size: 28px; margin-bottom: 6px; }
  ul { margin: 8px 0 0; padding-left: 18px; color: rgba(244,239,230,.86); font-size: 14px; line-height: 1.55; }
  .foot { margin-top: 32px; font-size: 11px; color: rgba(244,239,230,.45); max-width: 460px; line-height: 1.5; }
  .rule { height: 1px; margin: 24px 0; background: linear-gradient(90deg, transparent, rgba(212,181,106,.45), transparent); }
  .timeline { display: grid; gap: 10px; margin-top: 16px; }
  .tl { padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.1); font-size: 13px; }
</style>
</head>
<body>
  <div class="page">
    <div class="stars"></div>
    <div class="inner">
      <div style="margin:0 auto 10px;width:72px;height:72px;">
        <svg viewBox="0 0 200 200" width="72" height="72" role="img" aria-label="Amy Astro Intelligence">
          <defs>
            <radialGradient id="kNeb" cx="46%" cy="40%" r="58%">
              <stop offset="0%" stop-color="#fff1c2" stop-opacity=".7"/>
              <stop offset="30%" stop-color="#c084fc" stop-opacity=".95"/>
              <stop offset="62%" stop-color="#4c1d95"/>
              <stop offset="100%" stop-color="#0b1020"/>
            </radialGradient>
            <linearGradient id="kGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f0d78a"/><stop offset="50%" stop-color="#c9a24a"/><stop offset="100%" stop-color="#f5efe0"/>
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="91" fill="none" stroke="url(#kGold)" stroke-width="1.35" opacity=".8"/>
          <circle cx="100" cy="100" r="74" fill="none" stroke="url(#kGold)" stroke-width=".85" opacity=".4" stroke-dasharray="1.5 5.5"/>
          <circle cx="100" cy="100" r="46" fill="url(#kNeb)"/>
          <path d="M109 54c-17 0-32 15-32 36 0 12 5 21 13 27-11 5-18 15-18 28v11h74v-11c0-13-7-23-18-28 8-6 13-15 13-27 0-21-15-36-32-36z" fill="url(#kNeb)"/>
          <circle cx="109" cy="118" r="3.8" fill="#f0d78a"/>
        </svg>
      </div>
      <p class="eyebrow">Amy Astro Intelligence · Signature Edition</p>
      <h1>${escapeHtml(input.childName)}'s Cosmic Keepsake</h1>
      <p class="tag">A luxury portrait of noticing · not prediction</p>
      <p style="margin-top:16px;color:rgba(244,239,230,.72);font-size:14px;">Prepared with care for ${escapeHtml(input.parentName)}</p>
      <div class="card">
        <h2>Signature insight</h2>
        <div class="sig"><p>${signatureHtml}</p></div>
        <p style="margin-top:14px;color:#e8c97a;">${escapeHtml(input.signatureSentence)}</p>
      </div>
      <div class="grid">
        <div class="card planet"><div class="glyph">☀</div><h2>Sun</h2><p>${escapeHtml(input.sunSign)}</p></div>
        <div class="card planet"><div class="glyph">☾</div><h2>Moon</h2><p>${escapeHtml(input.moonPhaseLabel)} · ${escapeHtml(input.moonSign)}</p></div>
        <div class="card planet"><div class="glyph">↗</div><h2>Rising</h2><p>${escapeHtml(rising)}</p></div>
        <div class="card planet"><div class="glyph">✦</div><h2>Birth day</h2><p>${escapeHtml(input.birthDate)}</p></div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="stars"></div>
    <div class="inner">
      <p class="eyebrow">Child portrait</p>
      <h1>My Child's Cosmic Portrait</h1>
      <div class="card">
        <h2>Essence</h2>
        <p>${escapeHtml(input.essenceLine)}</p>
      </div>
      <div class="card">
        <h2>Three defining qualities</h2>
        <ul>${qualities}</ul>
      </div>
      <div class="card">
        <h2>Three parenting reminders</h2>
        <ul>${reminders}</ul>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="stars"></div>
    <div class="inner">
      <p class="eyebrow">Planet pages</p>
      <h1>Three lights of ${escapeHtml(input.childName)}</h1>
      <div class="card">
        <h2>Sun · ${escapeHtml(input.sunSign)}</h2>
        <p>Daylight themes — vitality, creative heat, the quiet pride of being gently seen. Offer small stages where effort is witnessed without comparison.</p>
      </div>
      <div class="card">
        <h2>Moon · ${escapeHtml(input.moonSign)}</h2>
        <p>A ${escapeHtml(input.moonPhaseLabel.toLowerCase())} emotional climate. Comfort often grows through belonging and rhythm. Protect soft landings after big days.</p>
      </div>
      <div class="card">
        <h2>Rising · ${escapeHtml(rising)}</h2>
        <p>How a room may first meet them — a soft doorway, never a script. Give unhurried first minutes in new spaces.</p>
      </div>
      <div class="card">
        <h2>Timeline of noticing</h2>
        <div class="timeline">
          <div class="tl">Birth sky formed · ${escapeHtml(input.birthDate)}</div>
          <div class="tl">Signature insight received</div>
          <div class="tl">Planet stories opened with care</div>
          <div class="tl">Reflection continues — no finish line</div>
        </div>
      </div>
    </div>
  </div>

  <div class="page">
    <div class="stars"></div>
    <div class="inner">
      <p class="eyebrow">Amy letter</p>
      <h1>A letter to parents</h1>
      <div class="card">
        <p>Dear ${escapeHtml(input.parentName)},</p>
        <p style="margin-top:12px;">${escapeHtml(input.amyReflection)}</p>
        <div class="rule"></div>
        <h2>Reflection</h2>
        <p>What have you already seen in ${escapeHtml(input.childName)} that this sky simply names more gently?</p>
        <p style="margin-top:12px;">Hold a quiet page for your own words:</p>
        <p style="margin-top:28px;border-bottom:1px solid rgba(212,181,106,.25);height:28px;"></p>
        <p style="margin-top:18px;border-bottom:1px solid rgba(212,181,106,.25);height:28px;"></p>
        <p style="margin-top:18px;border-bottom:1px solid rgba(212,181,106,.25);height:28px;"></p>
      </div>
      <p class="foot">Amy Astro Intelligence Keepsake — for awareness and reflection, not prediction. Generated locally in AmyNest. Educational and optional.</p>
    </div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
</body>
</html>`;

  try {
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${input.childName.replace(/[^\w.-]+/g, "_") || "child"}-amy-astro-keepsake.html`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
      return "downloaded";
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    return "printed";
  } catch {
    return "failed";
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
