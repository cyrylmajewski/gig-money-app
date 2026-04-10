// Pure trigger logic for reality checks, fresh start cards, and debt celebrations.
// No side effects — all functions take inputs and return trigger state.

export type RealityCheckCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'other'
  | 'general';

export interface RealityCheckTrigger {
  shouldShow: boolean;
  questionKey: string;
  category: RealityCheckCategory;
}

export interface FreshStartTrigger {
  shouldShow: boolean;
  messageKey: string;
  type: 'milestone' | 'calendar';
}

export interface DebtCelebration {
  shouldShow: boolean;
  debtLabel: string;
  closedAt: string;
}

// ---------------------------------------------------------------------------
// Reality Check
// ---------------------------------------------------------------------------

const REALITY_CHECK_QUESTIONS: Array<{
  key: string;
  category: RealityCheckCategory;
}> = [
  { key: 'triggers.realityCheck.q1', category: 'general' },
  { key: 'triggers.realityCheck.q2', category: 'food' },
  { key: 'triggers.realityCheck.q3', category: 'housing' },
  { key: 'triggers.realityCheck.q4', category: 'transport' },
  { key: 'triggers.realityCheck.q5', category: 'general' },
  { key: 'triggers.realityCheck.q6', category: 'general' },
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Deterministic-ish pick based on day-of-year so the same question shows all day. */
function pickQuestion(now: Date) {
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        (24 * 60 * 60 * 1000),
    );
  const index = dayOfYear % REALITY_CHECK_QUESTIONS.length;
  return REALITY_CHECK_QUESTIONS[index];
}

const NO_REALITY_CHECK: RealityCheckTrigger = {
  shouldShow: false,
  questionKey: '',
  category: 'general',
};

/**
 * Decide whether to show a reality-check question.
 *
 * Rules:
 * - Skip the first 7 days after installation (user is still settling in).
 * - Show if never checked, or if >3 days since last check.
 * - Question is picked deterministically per calendar day so the user sees the
 *   same question throughout the day.
 */
export function getRealityCheckTrigger(
  lastCheckAt: string | null,
  installationDate: string,
  now?: Date,
): RealityCheckTrigger {
  const currentDate = now ?? new Date();
  const installed = new Date(installationDate);

  // Skip first 7 days after installation
  if (currentDate.getTime() - installed.getTime() < SEVEN_DAYS_MS) {
    return NO_REALITY_CHECK;
  }

  // Show if never checked
  if (lastCheckAt === null) {
    const q = pickQuestion(currentDate);
    return { shouldShow: true, questionKey: q.key, category: q.category };
  }

  // Show if >3 days since last check
  const lastCheck = new Date(lastCheckAt);
  if (currentDate.getTime() - lastCheck.getTime() > THREE_DAYS_MS) {
    const q = pickQuestion(currentDate);
    return { shouldShow: true, questionKey: q.key, category: q.category };
  }

  return NO_REALITY_CHECK;
}

// ---------------------------------------------------------------------------
// Fresh Start
// ---------------------------------------------------------------------------

const MILESTONES: Array<{ days: number; key: string }> = [
  { days: 7, key: 'triggers.freshStart.milestone7' },
  { days: 30, key: 'triggers.freshStart.milestone30' },
  { days: 90, key: 'triggers.freshStart.milestone90' },
];

const NO_FRESH_START: FreshStartTrigger = {
  shouldShow: false,
  messageKey: '',
  type: 'calendar',
};

/**
 * Decide whether to show a fresh-start motivational card.
 *
 * Priority order (first match wins):
 * 1. Personal milestones: exactly 7 / 30 / 90 days from installation (same
 *    calendar day).
 * 2. Calendar triggers: 1st of month or Monday — only if not dismissed in the
 *    last 24 hours.
 *
 * Never shown within the first 7 days after installation.
 */
export function getFreshStartTrigger(
  installationDate: string,
  lastDismissedAt: string | null,
  now?: Date,
): FreshStartTrigger {
  const currentDate = now ?? new Date();
  const installed = new Date(installationDate);

  const daysSinceInstall = Math.floor(
    (currentDate.getTime() - installed.getTime()) / (24 * 60 * 60 * 1000),
  );

  // Skip first 7 days
  if (daysSinceInstall < 7) {
    return NO_FRESH_START;
  }

  // 1. Personal milestones (check if today lands on one)
  for (const milestone of MILESTONES) {
    if (daysSinceInstall === milestone.days) {
      return { shouldShow: true, messageKey: milestone.key, type: 'milestone' };
    }
  }

  // 2. Calendar triggers — skip if dismissed within last 24h
  if (lastDismissedAt !== null) {
    const dismissed = new Date(lastDismissedAt);
    if (currentDate.getTime() - dismissed.getTime() < TWENTY_FOUR_HOURS_MS) {
      return NO_FRESH_START;
    }
  }

  // First of month
  if (currentDate.getDate() === 1) {
    return {
      shouldShow: true,
      messageKey: 'triggers.freshStart.newMonth',
      type: 'calendar',
    };
  }

  // Monday (getDay() === 1)
  if (currentDate.getDay() === 1) {
    return {
      shouldShow: true,
      messageKey: 'triggers.freshStart.newWeek',
      type: 'calendar',
    };
  }

  return NO_FRESH_START;
}

// ---------------------------------------------------------------------------
// Debt Celebration
// ---------------------------------------------------------------------------

/**
 * Check if any debt was recently closed and hasn't been celebrated yet.
 *
 * Returns the most recently closed debt that doesn't match the last celebrated
 * debt label, or null if nothing to celebrate.
 */
export function getDebtCelebration(
  debts: Array<{ label: string; closedAt: string | null }>,
  lastCelebrationDebtId: string | null,
): DebtCelebration | null {
  // Collect closed debts, sort by closedAt descending (newest first)
  const closed = debts
    .filter((d): d is { label: string; closedAt: string } => d.closedAt !== null)
    .sort(
      (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime(),
    );

  if (closed.length === 0) {
    return null;
  }

  const newest = closed[0];

  // If we already celebrated this one, skip
  if (lastCelebrationDebtId !== null && newest.label === lastCelebrationDebtId) {
    return null;
  }

  return {
    shouldShow: true,
    debtLabel: newest.label,
    closedAt: newest.closedAt,
  };
}
