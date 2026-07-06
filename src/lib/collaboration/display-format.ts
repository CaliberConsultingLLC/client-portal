export function scaleScoreForDisplay(value: number) {
  return value * 10;
}

export function formatScoreForDisplay(
  value: number | null | undefined,
  decimals = 1
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return scaleScoreForDisplay(value).toFixed(decimals);
}

export function formatScoreDeltaForDisplay(
  value: number | null | undefined,
  decimals = 1
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return scaleScoreForDisplay(Math.abs(value)).toFixed(decimals);
}

const CI_STATEMENT_LABEL_PATTERNS: Array<[RegExp, string]> = [
  [/shares information/i, "Shares information"],
  [/provides updates early/i, "Early updates"],
  [/well-informed when making decisions/i, "Keeps team informed"],
  [/priorities align/i, "Priority alignment"],
  [/responds promptly/i, "Responds promptly"],
  [/willing to work with my team/i, "Solves shared problems"],
  [/work quality meets/i, "Work quality"],
  [/follows through/i, "Follow-through"],
  [/addresses them constructively/i, "Constructive resolution"],
  [/communicate the information/i, "Communication"],
  [/informed and involved/i, "Decision transparency"],
  [/provide the support/i, "Cross-team support"],
  [/how proactive/i, "Proactive communication"],
  [/work through it/i, "Conflict recovery"],
  [/quality your team expects/i, "Delivery quality"],
  [/operating rhythms/i, "Working style fit"],
];

function titlePhrase(words: string[]) {
  if (words.length === 0) return "Collaboration";
  return words
    .map((word, index) =>
      index === 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word.toLowerCase()
    )
    .join(" ");
}

/** Short theme label for a CI statement (bar charts, selectors). Full text stays in tables. */
export function succinctCiStatementLabel(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");
  if (!normalized) return "Collaboration";

  for (const [pattern, label] of CI_STATEMENT_LABEL_PATTERNS) {
    if (pattern.test(normalized)) return label;
  }

  let phrase = normalized
    .replace(/^when issues arise,\s*/i, "")
    .replace(/^this department(?:'s|\s+clearly|\s+consistently|\s+is|\s+keeps|\s+provides|\s+responds|\s+addresses)?\s+/i, "")
    .replace(/\.$/, "")
    .split(/\s+(?:when|that|if|with|for|to)\s+/i)[0]
    .trim();

  const words = phrase.split(/\s+/).filter(Boolean);
  if (words.length <= 4) {
    return titlePhrase(words);
  }

  return titlePhrase(words.slice(0, 3));
}
