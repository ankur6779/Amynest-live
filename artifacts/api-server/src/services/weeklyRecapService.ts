import { eq, and, or, isNull, lt } from "drizzle-orm";
import { adminAuth } from "../lib/firebase-admin";
import { db, parentProfilesTable, type ParentProfile } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendEmail, isEmailConfigured } from "../lib/email";
import { buildInsights, type InsightsResponse } from "./insightsService";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;
const APP_URL =
  process.env["APP_PUBLIC_URL"] ?? "https://amynest.in";
const MANAGE_PREFS_URL = `${APP_URL.replace(/\/$/, "")}/profile?notifications=1`;

export type ComposedRecap = {
  subject: string;
  html: string;
  text: string;
  preheader: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pickTopWin(insights: InsightsResponse): string {
  const s = insights.summary;
  if (s.routinesChangePct > 0 && s.routinesThisPeriod > 0) {
    return `You planned ${s.routinesThisPeriod} routine${s.routinesThisPeriod === 1 ? "" : "s"} this week — ${s.routinesChangePct}% more than last week.`;
  }
  if (s.positiveRateChangePts > 0) {
    return `Positive moments are up ${s.positiveRateChangePts} points compared to last week. Keep going!`;
  }
  if (s.routinesThisPeriod > 0) {
    return `You logged ${s.routinesThisPeriod} routine${s.routinesThisPeriod === 1 ? "" : "s"} this week. Consistency is the real win.`;
  }
  if (s.behaviorsThisPeriod > 0) {
    return `You captured ${s.behaviorsThisPeriod} parenting moment${s.behaviorsThisPeriod === 1 ? "" : "s"} this week.`;
  }
  return "A fresh week is a fresh start. Plan one small routine today.";
}

function pickFocusArea(insights: InsightsResponse): string {
  const s = insights.summary;
  if (insights.behaviorTypes.negative > insights.behaviorTypes.positive) {
    return "Tougher moments outweighed positive ones this week. Try noting two small wins each day — Amy can help spot patterns.";
  }
  if (s.routinesThisPeriod === 0) {
    return "No routines planned yet — even one short routine (15 minutes) can set the tone for tomorrow.";
  }
  if (s.positiveRateChangePts < -10) {
    return `Positive rate dipped ${Math.abs(s.positiveRateChangePts)} points. Consider what changed — sleep, school stress, screen time?`;
  }
  const sortedChildren = [...insights.perChild].sort(
    (a, b) => a.behaviorsCount - b.behaviorsCount,
  );
  const quietest = sortedChildren[0];
  if (quietest && insights.perChild.length > 1 && quietest.behaviorsCount === 0) {
    return `You logged nothing for ${escapeHtml(quietest.childName)} this week. A quick check-in could surface what's going well.`;
  }
  return "Try planning one new activity category next week — variety keeps both of you engaged.";
}

export function composeWeeklyRecap(
  profile: ParentProfile,
  insights: InsightsResponse,
): ComposedRecap {
  const greeting = profile.name ? `Hi ${escapeHtml(profile.name)},` : "Hi there,";
  const win = pickTopWin(insights);
  const focus = pickFocusArea(insights);
  const s = insights.summary;
  const preheader = insights.hasActivity
    ? `${s.routinesThisPeriod} routines · ${s.behaviorsThisPeriod} moments · ${s.positiveRateThisPeriod}% positive`
    : "Your weekly snapshot from AmyNest";

  const childRows = insights.perChild
    .map((c) => {
      return `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#0f172a;font-weight:600;">${escapeHtml(c.childName)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:right;">${c.routinesCount} routine${c.routinesCount === 1 ? "" : "s"}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:right;">${c.behaviorsCount} moment${c.behaviorsCount === 1 ? "" : "s"}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:${c.positiveRate >= 60 ? "#16a34a" : c.positiveRate >= 40 ? "#ca8a04" : "#dc2626"};text-align:right;font-weight:600;">${c.positiveRate}%</td>
      </tr>`;
    })
    .join("");

  const dayBars = insights.dayOfWeek
    .map((d) => {
      const max = Math.max(1, ...insights.dayOfWeek.map((x) => x.count));
      const h = Math.round((d.count / max) * 60) + 4;
      return `
        <td style="vertical-align:bottom;padding:0 4px;text-align:center;">
          <div style="height:${h}px;background:linear-gradient(180deg,#7c3aed,#ec4899);border-radius:4px;"></div>
          <div style="font-size:11px;color:#64748b;margin-top:6px;">${d.day}</div>
          <div style="font-size:11px;color:#0f172a;font-weight:600;">${d.count}</div>
        </td>`;
    })
    .join("");

  const summaryCards = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
      <tr>
        <td width="33%" style="padding:6px;">
          <div style="background:#faf5ff;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Routines</div>
            <div style="font-size:28px;color:#0f172a;font-weight:700;margin-top:6px;">${s.routinesThisPeriod}</div>
            <div style="font-size:12px;color:${s.routinesChangePct >= 0 ? "#16a34a" : "#dc2626"};margin-top:4px;">${s.routinesChangePct >= 0 ? "▲" : "▼"} ${Math.abs(s.routinesChangePct)}% vs last week</div>
          </div>
        </td>
        <td width="33%" style="padding:6px;">
          <div style="background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#ec4899;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Moments</div>
            <div style="font-size:28px;color:#0f172a;font-weight:700;margin-top:6px;">${s.behaviorsThisPeriod}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">last week: ${s.behaviorsPreviousPeriod}</div>
          </div>
        </td>
        <td width="33%" style="padding:6px;">
          <div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:12px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Positive</div>
            <div style="font-size:28px;color:#0f172a;font-weight:700;margin-top:6px;">${s.positiveRateThisPeriod}%</div>
            <div style="font-size:12px;color:${s.positiveRateChangePts >= 0 ? "#16a34a" : "#dc2626"};margin-top:4px;">${s.positiveRateChangePts >= 0 ? "▲" : "▼"} ${Math.abs(s.positiveRateChangePts)} pts</div>
          </div>
        </td>
      </tr>
    </table>`;

  const childrenBlock = insights.perChild.length
    ? `
    <h3 style="margin:24px 0 8px;color:#0f172a;font-size:16px;">Per child</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      ${childRows}
    </table>`
    : "";

  const familyBlock =
    insights.siblingHighlights && insights.siblingHighlights.length >= 2
      ? `
    <h3 style="margin:24px 0 8px;color:#0f172a;font-size:16px;">Family strengths</h3>
    <p style="margin:0 0 12px;color:#475569;font-size:13px;">Each child shines somewhere different. Here's what stood out.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${insights.siblingHighlights
        .map(
          (h) => `
      <tr>
        <td style="padding:6px 0;">
          <div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid ${h.accent};border-radius:10px;padding:12px 14px;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${escapeHtml(h.childName)}</div>
            <div style="font-size:15px;color:${h.accent};font-weight:700;margin-top:2px;">${escapeHtml(h.headline)}</div>
            <div style="font-size:13px;color:#334155;margin-top:4px;line-height:1.4;">${escapeHtml(h.detail)}</div>
          </div>
        </td>
      </tr>`,
        )
        .join("")}
    </table>`
      : "";

  const dayBlock = insights.hasActivity
    ? `
    <h3 style="margin:24px 0 8px;color:#0f172a;font-size:16px;">When the week was busiest</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 8px;">
      <tr>${dayBars}</tr>
    </table>`
    : "";

  const emptyBlock = !insights.hasActivity
    ? `
    <div style="background:#fff;border:1px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;color:#475569;margin-top:16px;">
      <p style="margin:0 0 8px;font-weight:600;color:#0f172a;">${insights.emptyReason === "no_children" ? "Add your first child to get started" : "No activity logged this week"}</p>
      <p style="margin:0;font-size:14px;">Open AmyNest and tap <strong>${insights.emptyReason === "no_children" ? "Children" : "Routines"}</strong> to begin.</p>
    </div>`
    : "";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your week with AmyNest</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f8fafc;">${escapeHtml(preheader)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;color:#fff;">
              <div style="font-size:13px;opacity:0.85;text-transform:uppercase;letter-spacing:1px;">AmyNest weekly recap</div>
              <div style="font-size:22px;font-weight:700;margin-top:4px;">Your week, summarised</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;font-size:15px;color:#0f172a;">${greeting}</p>
              ${insights.hasActivity ? summaryCards : ""}
              <div style="background:#f8fafc;border-left:4px solid #16a34a;padding:14px 16px;border-radius:8px;margin:16px 0;">
                <div style="font-size:12px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">This week's win</div>
                <div style="font-size:15px;color:#0f172a;margin-top:4px;">${escapeHtml(win)}</div>
              </div>
              <div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px 16px;border-radius:8px;margin:16px 0;">
                <div style="font-size:12px;color:#d97706;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">One thing to try</div>
                <div style="font-size:15px;color:#0f172a;margin-top:4px;">${escapeHtml(focus)}</div>
              </div>
              ${childrenBlock}
              ${familyBlock}
              ${dayBlock}
              ${emptyBlock}
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;font-size:15px;">Open AmyNest</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8;">
              You're getting this because weekly recap emails are on.<br/>
              <a href="${MANAGE_PREFS_URL}" style="color:#7c3aed;text-decoration:underline;">Manage email preferences</a>
              &nbsp;·&nbsp;
              <a href="mailto:Support@amynest.in?subject=Unsubscribe%20weekly%20recap" style="color:#7c3aed;text-decoration:underline;">Email support to unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts: string[] = [
    `${greeting.replace(/<[^>]+>/g, "")}`,
    "",
    "Your AmyNest weekly recap",
    "—",
    insights.hasActivity
      ? `Routines: ${s.routinesThisPeriod} (${s.routinesChangePct >= 0 ? "+" : ""}${s.routinesChangePct}% vs last week)\nMoments: ${s.behaviorsThisPeriod} (last week ${s.behaviorsPreviousPeriod})\nPositive: ${s.positiveRateThisPeriod}% (${s.positiveRateChangePts >= 0 ? "+" : ""}${s.positiveRateChangePts} pts)`
      : "No activity logged this week.",
    "",
    `This week's win: ${win}`,
    `One thing to try: ${focus}`,
    "",
    ...(insights.siblingHighlights && insights.siblingHighlights.length >= 2
      ? [
          "Family strengths:",
          ...insights.siblingHighlights.map(
            (h) => `  - ${h.childName}: ${h.headline} — ${h.detail}`,
          ),
          "",
        ]
      : []),
    `Open AmyNest: ${APP_URL}`,
    "",
    `Manage email preferences: ${MANAGE_PREFS_URL}`,
    "Or email Support@amynest.in to unsubscribe.",
  ];
  const text = textParts.join("\n");

  const subject = insights.hasActivity
    ? `Your AmyNest week: ${s.routinesThisPeriod} routines, ${s.positiveRateThisPeriod}% positive`
    : "Your AmyNest week — let's get started";

  return { subject, html, text, preheader };
}

async function getPrimaryEmail(userId: string): Promise<string | null> {
  try {
    const user = await adminAuth().getUser(userId);
    return user.email ?? null;
  } catch (err) {
    logger.warn({ err, userId }, "Could not load Clerk user for weekly recap");
    return null;
  }
}

export type SendRecapResult = {
  sent: boolean;
  reason?:
    | "no_email"
    | "opted_out"
    | "no_provider"
    | "send_failed"
    | "recently_sent";
  emailId?: string | null;
  preview?: ComposedRecap;
};

/**
 * Atomic single-row claim. Sets lastWeeklyRecapSentAt only if the user is
 * eligible RIGHT NOW (opted-in + last send was >6 days ago or never). Returns
 * the previous timestamp value so we can roll back if the email send fails.
 *
 * This is the cross-instance safety guarantee: even if two cron firings race,
 * exactly one will get rowsAffected=1 and proceed to send. The other gets
 * rowsAffected=0 and bails with "recently_sent".
 */
type Claim = { claimedAt: Date };

async function tryClaim(userId: string): Promise<Claim | null> {
  const sixDaysAgo = new Date(Date.now() - SIX_DAYS_MS);
  const claimedAt = new Date();
  const rows = await db
    .update(parentProfilesTable)
    .set({ lastWeeklyRecapSentAt: claimedAt, updatedAt: claimedAt })
    .where(
      and(
        eq(parentProfilesTable.userId, userId),
        eq(parentProfilesTable.emailNotificationsEnabled, true),
        or(
          isNull(parentProfilesTable.lastWeeklyRecapSentAt),
          lt(parentProfilesTable.lastWeeklyRecapSentAt, sixDaysAgo),
        ),
      ),
    )
    .returning({ id: parentProfilesTable.id });
  return rows.length > 0 ? { claimedAt } : null;
}

/**
 * Compare-and-swap rollback. Only restores the previous timestamp if
 * lastWeeklyRecapSentAt is still exactly the claim we wrote. If a concurrent
 * successful send (e.g. manual /send-now) has overwritten our timestamp with
 * a newer value, we leave it alone — that newer send is the source of truth
 * and we don't want to clobber it back to "eligible".
 */
async function rollbackClaim(
  userId: string,
  claim: Claim,
  previous: Date | null,
): Promise<void> {
  await db
    .update(parentProfilesTable)
    .set({ lastWeeklyRecapSentAt: previous, updatedAt: new Date() })
    .where(
      and(
        eq(parentProfilesTable.userId, userId),
        eq(parentProfilesTable.lastWeeklyRecapSentAt, claim.claimedAt),
      ),
    );
}

export async function sendRecapForUser(args: {
  userId: string;
  bypassRecentGuard?: boolean;
  includePreview?: boolean;
}): Promise<SendRecapResult> {
  const { userId, bypassRecentGuard = false, includePreview = false } = args;

  const [profile] = await db
    .select()
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);

  if (!profile) {
    return { sent: false, reason: "no_email" };
  }
  if (!profile.emailNotificationsEnabled && !bypassRecentGuard) {
    return { sent: false, reason: "opted_out" };
  }

  // Atomic claim path for the cron — multiple instances can't double-send.
  // Manual "send-now" bypasses the guard entirely.
  const previousSentAt = profile.lastWeeklyRecapSentAt ?? null;
  let claim: Claim | null = null;
  if (!bypassRecentGuard) {
    claim = await tryClaim(userId);
    if (!claim) {
      return { sent: false, reason: "recently_sent" };
    }
  }

  const email = await getPrimaryEmail(userId);
  if (!email) {
    if (claim) await rollbackClaim(userId, claim, previousSentAt);
    return { sent: false, reason: "no_email" };
  }

  const insights = await buildInsights({ userId, range: "week" });
  const composed = composeWeeklyRecap(profile, insights);

  const result = await sendEmail({
    to: email,
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
  });

  if (!result.ok) {
    if (claim) await rollbackClaim(userId, claim, previousSentAt);
    return {
      sent: false,
      reason: result.reason,
      ...(includePreview ? { preview: composed } : {}),
    };
  }

  if (bypassRecentGuard) {
    // Manual path didn't claim — write the timestamp now.
    await db
      .update(parentProfilesTable)
      .set({ lastWeeklyRecapSentAt: new Date(), updatedAt: new Date() })
      .where(eq(parentProfilesTable.userId, userId));
  }

  return {
    sent: true,
    emailId: result.id,
    ...(includePreview ? { preview: composed } : {}),
  };
}

export async function dispatchWeeklyRecaps(): Promise<{
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  if (!isEmailConfigured()) {
    logger.warn("Skipping weekly recap dispatch — RESEND_API_KEY not set");
    return { attempted: 0, sent: 0, skipped: 0, failed: 0 };
  }
  const profiles = await db
    .select()
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.emailNotificationsEnabled, true));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const p of profiles) {
    try {
      const r = await sendRecapForUser({ userId: p.userId });
      if (r.sent) sent += 1;
      else if (r.reason === "send_failed") failed += 1;
      else skipped += 1;
    } catch (err) {
      logger.error({ err, userId: p.userId }, "Weekly recap send threw");
      failed += 1;
    }
  }
  logger.info(
    { attempted: profiles.length, sent, skipped, failed },
    "Weekly recap dispatch complete",
  );
  return { attempted: profiles.length, sent, skipped, failed };
}
