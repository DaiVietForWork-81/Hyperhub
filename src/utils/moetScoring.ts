/**
 * MOET 2025 Graduated Scoring Engine & Spaced Repetition (SRS) Mistake Notebook
 * Implements official Vietnamese High School Graduation Exam (THPT 2025) scoring rules:
 * - Part I (Multiple Choice A/B/C/D): 0.25 pts per question
 * - Part II (True/False Cluster a,b,c,d): Graduated scoring per question:
 *     1 correct statement  -> 0.10 pts
 *     2 correct statements -> 0.25 pts
 *     3 correct statements -> 0.50 pts
 *     4 correct statements -> 1.00 pt
 * - Part III (Short Numerical Answer): 0.50 pts per question with comma/dot and ±0.01 tolerance
 */

export interface MoetQuestionGradeDetail {
  questionKey: string;
  part: 1 | 2 | 3;
  isEvaluated: boolean;
  isFullyCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  userAnswerSummary: string;
  correctAnswerSummary: string;
  matchedSubItems?: number; // For Part II (0..4)
}

export interface MoetExamGradeResult {
  totalScore10: number;
  rawEarnedPoints: number;
  rawMaxPoints: number;
  evaluatedQuestionCount: number;
  correctCount: number;
  part1Earned: number;
  part2Earned: number;
  part3Earned: number;
  detailsByKey: Record<string, MoetQuestionGradeDetail>;
  wrongPart1Numbers: number[];
}

export function normalizeNumericAnswer(val: string): { normalized: string; numericValue: number | null } {
  const cleaned = String(val || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  if (!cleaned) return { normalized: '', numericValue: null };
  const num = Number(cleaned);
  return {
    normalized: cleaned.toLowerCase(),
    numericValue: Number.isFinite(num) ? num : null,
  };
}

export function isShortAnswerMatch(userVal: string, keyVal: string, tolerance = 0.01): boolean {
  const u = normalizeNumericAnswer(userVal);
  const k = normalizeNumericAnswer(keyVal);
  if (!u.normalized || !k.normalized) return false;
  if (u.normalized === k.normalized) return true;
  if (u.numericValue !== null && k.numericValue !== null) {
    return Math.abs(u.numericValue - k.numericValue) <= tolerance;
  }
  return false;
}

const PART2_GRADUATED_POINTS: Record<number, number> = {
  0: 0,
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 1.0,
};

export function gradeMoet2025Exam(params: {
  part1Count: number;
  mcqAnswers: Record<number, string>;
  tfAnswers: Record<string, boolean | null | undefined>;
  shortAnswers: Record<number, string>;
  answerKeys: Record<string, string>;
}): MoetExamGradeResult {
  const { part1Count, mcqAnswers, tfAnswers, shortAnswers, answerKeys } = params;
  const detailsByKey: Record<string, MoetQuestionGradeDetail> = {};
  const wrongPart1Numbers: number[] = [];

  let part1Earned = 0;
  let part2Earned = 0;
  let part3Earned = 0;
  let rawMaxPoints = 0;
  let evaluatedQuestionCount = 0;
  let correctCount = 0;

  // 1. Grade Part I (Multiple Choice A/B/C/D: 0.25 pts each)
  for (let q = 1; q <= part1Count; q++) {
    const expected = answerKeys[String(q)];
    if (expected && /^[A-D]$/i.test(expected)) {
      const maxPoints = 0.25;
      evaluatedQuestionCount++;
      rawMaxPoints += maxPoints;
      const userChoice = (mcqAnswers[q] || '').toUpperCase();
      const targetChoice = expected.toUpperCase();
      const isOk = userChoice === targetChoice;
      const earned = isOk ? maxPoints : 0;
      part1Earned += earned;
      if (isOk) {
        correctCount++;
      } else {
        wrongPart1Numbers.push(q);
      }
      detailsByKey[`p1_${q}`] = {
        questionKey: `p1_${q}`,
        part: 1,
        isEvaluated: true,
        isFullyCorrect: isOk,
        earnedPoints: earned,
        maxPoints,
        userAnswerSummary: userChoice || '(Trống)',
        correctAnswerSummary: targetChoice,
      };
    }
  }

  // 2. Grade Part II (True/False 4 statements a,b,c,d: graduated 0.10 / 0.25 / 0.50 / 1.00 pt)
  for (let qIdx = 1; qIdx <= 4; qIdx++) {
    const absQ = part1Count + qIdx;
    const subItems = (['a', 'b', 'c', 'd'] as const).map((sub) => {
      const keyVal =
        answerKeys[`tf_${qIdx}_${sub}`] ||
        answerKeys[`tf_${absQ}_${sub}`];
      const userVal =
        tfAnswers[`${qIdx}_${sub}`] ??
        tfAnswers[`${absQ}_${sub}`] ??
        tfAnswers[`${qIdx}-${sub}`];
      return { sub, keyVal, userVal };
    });

    const hasOfficialTfKey = subItems.some((item) => item.keyVal === 'Đ' || item.keyVal === 'S');
    if (hasOfficialTfKey) {
      const maxPoints = 1.0;
      evaluatedQuestionCount++;
      rawMaxPoints += maxPoints;
      let matched = 0;
      const userSummary: string[] = [];
      const keySummary: string[] = [];

      for (const item of subItems) {
        const uSym = item.userVal === true ? 'Đ' : item.userVal === false ? 'S' : '-';
        userSummary.push(`${item.sub}:${uSym}`);
        if (item.keyVal === 'Đ' || item.keyVal === 'S') {
          keySummary.push(`${item.sub}:${item.keyVal}`);
          if (uSym === item.keyVal) matched++;
        }
      }

      const earned = PART2_GRADUATED_POINTS[matched] ?? 0;
      part2Earned += earned;
      const isFullyCorrect = matched === 4;
      if (isFullyCorrect) correctCount++;

      detailsByKey[`p2_${qIdx}`] = {
        questionKey: `p2_${qIdx}`,
        part: 2,
        isEvaluated: true,
        isFullyCorrect,
        earnedPoints: earned,
        maxPoints,
        userAnswerSummary: userSummary.join(' '),
        correctAnswerSummary: keySummary.join(' '),
        matchedSubItems: matched,
      };
    }
  }

  // 3. Grade Part III (Short Numerical Answers: 0.50 pts each with comma/dot and ±0.01 tolerance)
  for (let sIdx = 1; sIdx <= 6; sIdx++) {
    const absQ = part1Count + 4 + sIdx;
    const expectedShort =
      answerKeys[`short_${sIdx}`] ||
      answerKeys[`short_${absQ}`] ||
      (answerKeys[String(absQ)] && !/^[A-D]$/i.test(answerKeys[String(absQ)])
        ? answerKeys[String(absQ)]
        : undefined);

    if (expectedShort !== undefined) {
      const maxPoints = 0.5;
      evaluatedQuestionCount++;
      rawMaxPoints += maxPoints;
      const userShort = shortAnswers[sIdx] || shortAnswers[absQ] || '';
      const isOk = isShortAnswerMatch(userShort, expectedShort);
      const earned = isOk ? maxPoints : 0;
      part3Earned += earned;
      if (isOk) correctCount++;

      detailsByKey[`p3_${sIdx}`] = {
        questionKey: `p3_${sIdx}`,
        part: 3,
        isEvaluated: true,
        isFullyCorrect: isOk,
        earnedPoints: earned,
        maxPoints,
        userAnswerSummary: userShort || '(Trống)',
        correctAnswerSummary: expectedShort,
      };
    }
  }

  const rawEarnedPoints = Number((part1Earned + part2Earned + part3Earned).toFixed(2));
  const totalScore10 =
    rawMaxPoints > 0
      ? Number(Math.min(10, (rawEarnedPoints / rawMaxPoints) * 10).toFixed(2))
      : 0;

  return {
    totalScore10,
    rawEarnedPoints,
    rawMaxPoints: Number(rawMaxPoints.toFixed(2)),
    evaluatedQuestionCount,
    correctCount,
    part1Earned: Number(part1Earned.toFixed(2)),
    part2Earned: Number(part2Earned.toFixed(2)),
    part3Earned: Number(part3Earned.toFixed(2)),
    detailsByKey,
    wrongPart1Numbers,
  };
}

// ============================================================================
// SPACED REPETITION SYSTEM (SRS) MISTAKE NOTEBOOK (1 - 3 - 7 - 14 - 30 days)
// ============================================================================

export interface SrsMistakeCard {
  id: string; // `${docId}_q${questionNum}`
  docId: number;
  docTitle: string;
  subject: string;
  questionNum: number;
  questionText: string;
  options: Record<string, string>;
  userAnswer: string;
  correctAnswer: string;
  intervalIndex: number; // 0 -> 1d, 1 -> 3d, 2 -> 7d, 3 -> 14d, 4 -> 30d
  nextReviewAt: string; // ISO string
  lastReviewedAt: string; // ISO string
  mistakeCount: number;
}

const SRS_STORAGE_KEY = 'orbit_srs_mistakes_v1';
const SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30];

export function getSrsMistakeCards(): SrsMistakeCard[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSrsCards(cards: SrsMistakeCard[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(cards.slice(0, 300)));
  } catch {
    // ignore storage quota errors
  }
}

export function saveSrsMistakeCard(input: {
  docId: number;
  docTitle: string;
  subject: string;
  questionNum: number;
  questionText: string;
  options?: Record<string, string>;
  userAnswer?: string;
  correctAnswer?: string;
}): SrsMistakeCard {
  const cards = getSrsMistakeCards();
  const id = `${input.docId}_q${input.questionNum}`;
  const existingIdx = cards.findIndex((c) => c.id === id);
  const now = new Date();
  const nextReview = new Date(now.getTime() + SRS_INTERVAL_DAYS[0] * 86400000);

  const updatedCard: SrsMistakeCard = {
    id,
    docId: input.docId,
    docTitle: input.docTitle,
    subject: input.subject || 'Tổng hợp',
    questionNum: input.questionNum,
    questionText: input.questionText,
    options: input.options || {},
    userAnswer: input.userAnswer || '',
    correctAnswer: input.correctAnswer || '',
    intervalIndex: 0,
    nextReviewAt: nextReview.toISOString(),
    lastReviewedAt: now.toISOString(),
    mistakeCount: existingIdx >= 0 ? cards[existingIdx].mistakeCount + 1 : 1,
  };

  if (existingIdx >= 0) {
    cards[existingIdx] = updatedCard;
  } else {
    cards.unshift(updatedCard);
  }
  persistSrsCards(cards);
  return updatedCard;
}
