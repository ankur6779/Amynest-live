export interface ModerationRule {
  code: string;
  pattern: RegExp;
  message: string;
  severity: "reject" | "warn";
}

/** Content safety rules for AmyNest parenting videos. */
export const MODERATION_RULES: ModerationRule[] = [
  {
    code: "medical_misinformation",
    pattern:
      /\b(cure autism|cure adhd|miracle cure|heal autism|guaranteed medical|diagnose your child|stop vaccines?|replace doctor)\b/i,
    message: "Medical misinformation or diagnostic claims are not allowed",
    severity: "reject",
  },
  {
    code: "unsafe_parenting",
    pattern:
      /\b(hit your child|beat the child|starve|sleep train with neglect|shake the baby|leave baby alone in car)\b/i,
    message: "Unsafe parenting advice detected",
    severity: "reject",
  },
  {
    code: "harmful_claims",
    pattern:
      /\b(guaranteed results|100% success|never fails|instant transformation|permanently fix)\b/i,
    message: "Harmful absolute claims detected",
    severity: "reject",
  },
  {
    code: "political_content",
    pattern:
      /\b(vote for|election|political party|bjp|congress party|leftist|right wing propaganda)\b/i,
    message: "Political content is not allowed",
    severity: "reject",
  },
  {
    code: "religious_targeting",
    pattern:
      /\b(convert to|only true religion|hate (muslims|hindus|christians|sikhs)|religious inferior)\b/i,
    message: "Religious targeting is not allowed",
    severity: "reject",
  },
  {
    code: "adult_content",
    pattern: /\b(porn|nsfw|sexual content|erotic|xxx)\b/i,
    message: "Adult content is not allowed",
    severity: "reject",
  },
  {
    code: "violence",
    pattern: /\b(kill|murder|bloodbath|graphic violence|weaponize)\b/i,
    message: "Violent content is not allowed",
    severity: "reject",
  },
];
