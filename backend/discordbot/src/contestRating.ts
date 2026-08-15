export interface ContestRatingInfo {
    contestType: string;
    isHeuristic: boolean;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    ratingRangeBegin?: number;
    ratingRangeEnd: number;
}

export interface ContestTask {
    Assignment?: string;
    TaskName?: string;
    TaskScreenName: string;
}

export interface ContestTaskResult {
    Count?: number;
    Failure?: number;
    Score?: number;
    Status?: number;
    Pending?: boolean;
    Frozen?: boolean;
}

export interface ContestStanding {
    Rank?: number;
    UserScreenName: string;
    IsRated?: boolean;
    Rating?: number;
    OldRating?: number;
    Competitions?: number;
    TotalResult?: {
        Count?: number;
        Accepted?: number;
        Penalty?: number;
        Score?: number;
        Elapsed?: number;
    };
    TaskResults?: Record<string, ContestTaskResult>;
}

export interface ContestStandingsPayload {
    Fixed?: boolean;
    TaskInfo?: ContestTask[];
    StandingsData?: ContestStanding[];
}

export interface UserContestEstimate {
    performance?: number;
    newRating?: number;
    ratingDelta?: number;
}

export interface HeuristicRatingHistory {
    performance: number;
    startTime?: Date;
    endTime: Date;
    duration?: number;
}

const DISCRIMINATION = Math.log(6) / 400;

function safeNumber(value: number | undefined, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getContestRatingParameters(contest: ContestRatingInfo) {
    if (contest.isHeuristic) {
        return { defaultPerformance: 1000, ratingBound: 9999 };
    }

    const legacyDefaultPerformance = (() => {
        switch (contest.contestType) {
            case 'ABC': return 800;
            case 'ARC': return 1200;
            case 'AGC': return 1600;
            default: return 800;
        }
    })();

    // AtCoder changed the virtual initial internal rating from 800 to 1200
    // starting with ABC430 (2025-11-01). It matters only when rating 0 is in
    // the contest's rated range; for ARC/AGC newcomers rating 0 is unrated.
    const firstContestDefaultChangedAt = new Date('2025-11-01T00:00:00+09:00');
    const usesCurrentFirstContestDefault =
        contest.startTime !== undefined &&
        contest.startTime >= firstContestDefaultChangedAt &&
        (contest.ratingRangeBegin === undefined || contest.ratingRangeBegin <= 0);

    switch (contest.contestType) {
        case 'ABC':
            // AtCoderProblems uses 1600 for old ABCs and 2400 for current ABCs.
            return {
                defaultPerformance: usesCurrentFirstContestDefault ? 1200 : legacyDefaultPerformance,
                ratingBound: contest.ratingRangeEnd > 0 && contest.ratingRangeEnd <= 1199 ? 1600 : 2400,
            };
        case 'ARC':
            return { defaultPerformance: usesCurrentFirstContestDefault ? 1200 : legacyDefaultPerformance, ratingBound: 3200 };
        case 'AGC':
            return { defaultPerformance: usesCurrentFirstContestDefault ? 1200 : legacyDefaultPerformance, ratingBound: 9999 };
        default:
            return { defaultPerformance: usesCurrentFirstContestDefault ? 1200 : legacyDefaultPerformance, ratingBound: 9999 };
    }
}

/** Inverse of AtCoder's participation-count adjustment. */
export function inverseAdjustRating(rating: number, previousContests: number): number {
    if (!Number.isFinite(rating) || rating <= 0) return Number.NaN;

    let rawRating = rating;
    if (rawRating <= 400) {
        rawRating = 400 * (1 - Math.log(400 / rawRating));
    }
    const n = Math.max(0, previousContests);
    if (n === 0) return rawRating;

    const adjustment =
        ((Math.sqrt(1 - 0.9 ** (2 * n)) / (1 - 0.9 ** n) - 1) / (Math.sqrt(19) - 1)) * 1200;
    return rawRating + adjustment;
}

/** AtCoder's display adjustment for a raw rating. */
export function adjustRating(rawRating: number, contests: number): number {
    const n = Math.max(1, contests);
    const f1 = 1;
    const fInf = 1 / Math.sqrt(19);
    const fn = Math.sqrt(1 - 0.81 ** n) / (Math.sqrt(19) * (1 - 0.9 ** n));
    const discountedRating = rawRating - ((fn - fInf) / (f1 - fInf)) * 1200;
    if (discountedRating >= 400) return Math.floor(discountedRating);
    return Math.floor(Math.max(1, 400 / Math.exp((400 - discountedRating) / 400)));
}

/** Convert AtCoder's internal (unpositivized) value to the displayed value. */
export function positivizeRating(rating: number): number {
    if (rating >= 400) return rating;
    return 400 * Math.exp((rating - 400) / 400);
}

/** AtCoderProblems' clipped difficulty used for display. */
export function clipDifficulty(difficulty: number): number {
    if (difficulty >= 400) return Math.round(difficulty);
    return Math.round(400 / Math.exp(1 - difficulty / 400));
}

export function getTaskResult(row: ContestStanding, task: ContestTask): ContestTaskResult | undefined {
    const results = row.TaskResults ?? {};
    return results[task.TaskScreenName] ??
        (task.Assignment ? results[task.Assignment] : undefined) ??
        (task.TaskName ? results[task.TaskName] : undefined);
}

function isAccepted(result: ContestTaskResult | undefined) {
    if (!result) return false;
    // Algorithm contests are all-or-nothing. Status 1 is AC in standings/json;
    // Score > 0 also covers older response formats.
    return result.Status === 1 || safeNumber(result.Score) > 0;
}

/**
 * Estimate a problem difficulty using AtCoderProblems' 1PLM/2PLM fallback.
 * The estimator intentionally follows estimator/main.py: it needs at least
 * 40 rated, non-retreated users and skips all-solved/no-solved problems.
 */
export function estimateDifficulty(rows: ContestStanding[], task: ContestTask): number | undefined {
    const samples = rows
        .filter((row) => safeNumber(row.TotalResult?.Count) > 0)
        .map((row) => {
            const rating = safeNumber(row.OldRating);
            const contests = safeNumber(row.Competitions);
            if (rating <= 0 || contests <= 0) return undefined;
            const rawRating = inverseAdjustRating(rating, contests);
            return Number.isFinite(rawRating) ? { rawRating, accepted: isAccepted(getTaskResult(row, task)) } : undefined;
        })
        .filter((sample): sample is { rawRating: number; accepted: boolean } => sample !== undefined);

    if (samples.length < 40) return undefined;
    const acceptedCount = samples.filter((sample) => sample.accepted).length;
    if (acceptedCount === 0 || acceptedCount === samples.length) return undefined;

    let lower = -10000;
    let upper = 10000;
    while (upper - lower > 1) {
        const middle = Math.floor((lower + upper) / 2);
        const expectedAccepted = samples.reduce(
            (sum, sample) => sum + 1 / (1 + Math.exp(DISCRIMINATION * (middle - sample.rawRating))),
            0,
        );
        if (expectedAccepted < acceptedCount) upper = middle;
        else lower = middle;
    }
    return clipDifficulty(lower);
}

/** AtCoderProblems' rank-to-performance calculation. */
export function estimatePerformances(
    rows: ContestStanding[],
    contest: ContestRatingInfo,
    averagePerformanceByUser?: ReadonlyMap<string, number>,
): Map<string, number> {
    const { defaultPerformance } = getContestRatingParameters(contest);
    const rankedRows = rows
        .filter((row) =>
            safeNumber(row.Rank) > 0 &&
            (contest.isHeuristic
                ? row.IsRated !== false && safeNumber(row.TotalResult?.Count) > 0
                : row.IsRated !== false),
        )
        .sort((a, b) => safeNumber(a.Rank) - safeNumber(b.Rank));
    const rawRatings = rankedRows.map((row) => {
        const cachedAverage = averagePerformanceByUser?.get(row.UserScreenName.toLowerCase());
        if (cachedAverage !== undefined && Number.isFinite(cachedAverage)) return cachedAverage;
        // AHC ratings are history-based; the algorithmic inverse adjustment is
        // not meaningful for a heuristic rating. Unknown AHC users start from
        // the official Center=1000 APerf.
        if (contest.isHeuristic) return defaultPerformance;
        const rating = safeNumber(row.OldRating);
        const contests = safeNumber(row.Competitions);
        if (rating > 0 && contests > 0) {
            const raw = inverseAdjustRating(rating, contests);
            if (Number.isFinite(raw)) return raw;
        }
        return defaultPerformance;
    });

    const performanceByUser = new Map<string, number>();
    const cache = new Map<number, number>();
    let position = 0;
    while (position < rankedRows.length) {
        const rank = safeNumber(rankedRows[position].Rank);
        let groupEnd = position + 1;
        while (groupEnd < rankedRows.length && safeNumber(rankedRows[groupEnd].Rank) === rank) groupEnd += 1;
        const averagePosition = (position + groupEnd - 1) / 2;

        let lower = -10000;
        let upper = 10000;
        while (Math.round(lower) < Math.round(upper)) {
            const middle = (lower + upper) / 2;
            let predictedRank = cache.get(middle);
            if (predictedRank === undefined) {
                predictedRank = rawRatings.reduce(
                    (sum, rawRating) => sum + 1 / (1 + 6 ** ((middle - rawRating) / 400)),
                    0,
                );
                cache.set(middle, predictedRank);
            }
            if (predictedRank < averagePosition + 0.5) upper = middle;
            else lower = middle;
        }

        const performance = Math.round(lower);
        for (let index = position; index < groupEnd; index += 1) {
            const row = rankedRows[index];
            // The newcomer/default APerf is used as an input for the rank
            // model. It must not be applied a second time to the participant's
            // own performance when converting performance to rating.
            performanceByUser.set(row.UserScreenName.toLowerCase(), performance);
        }
        position = groupEnd;
    }
    return performanceByUser;
}

const HEURISTIC_PERFORMANCE_SCALE = 724.4744301;
const HEURISTIC_RATING_DECAY = 0.8271973364;
const HEURISTIC_DECAY_DAYS = 365;
const HEURISTIC_PREVIOUS_WEIGHT_CHANGE = new Date('2025-01-01T00:00:00+09:00');

function heuristicContestWeight(history: HeuristicRatingHistory) {
    if (history.endTime < HEURISTIC_PREVIOUS_WEIGHT_CHANGE) return 1;
    const startTime = history.startTime ?? new Date(history.endTime.getTime() - safeNumber(history.duration) * 60 * 1000);
    const isShortContest = history.endTime.getTime() - startTime.getTime() < 24 * 60 * 60 * 1000;
    return isShortContest ? 0.5 : 1;
}

/** AtCoder Heuristic Rating System v2, including decay and weighted history. */
export function calculateHeuristicRating(history: HeuristicRatingHistory[]): number {
    if (history.length === 0) return 0;
    const latestEndTime = Math.max(...history.map((result) => result.endTime.getTime()));
    const expanded: Array<{ performance: number; weight: number }> = [];

    for (const result of history) {
        const daysSinceContest = Math.max(
            0,
            Math.floor(latestEndTime / (24 * 60 * 60 * 1000)) -
            Math.floor(result.endTime.getTime() / (24 * 60 * 60 * 1000)),
        );
        const decayedPerformance = result.performance + 150 - (100 * daysSinceContest) / HEURISTIC_DECAY_DAYS;
        const weight = heuristicContestWeight(result);
        for (let index = 1; index <= 100; index += 1) {
            expanded.push({
                performance: decayedPerformance - HEURISTIC_PERFORMANCE_SCALE * Math.log(index),
                weight,
            });
        }
    }

    expanded.sort((a, b) => b.performance - a.performance);
    let previousWeight = 0;
    let rating = 0;
    for (const result of expanded) {
        const nextWeight = previousWeight + result.weight;
        rating += result.performance * (HEURISTIC_RATING_DECAY ** previousWeight - HEURISTIC_RATING_DECAY ** nextWeight);
        previousWeight = nextWeight;
    }
    if (rating >= 400) return rating;
    return 400 * Math.exp((rating - 400) / 400);
}

/** Estimate the displayed rating after this contest from old rating/count. */
export function estimateNewRating(
    row: ContestStanding,
    contest: ContestRatingInfo,
    performance: number | undefined,
    heuristicHistory: readonly HeuristicRatingHistory[] = [],
): number | undefined {
    if (row.IsRated === false || performance === undefined) return undefined;
    if (contest.isHeuristic) {
        if (safeNumber(row.TotalResult?.Count) <= 0) return undefined;
        // AHC's displayed rating cannot be reconstructed from OldRating alone;
        // avoid showing a large fake delta if the local history has not synced.
        if (heuristicHistory.length === 0 && safeNumber(row.OldRating) > 0 && safeNumber(row.Competitions) > 0) {
            return undefined;
        }
        const currentEndTime = contest.endTime ?? contest.startTime ?? new Date();
        const currentHistory: HeuristicRatingHistory = {
            performance,
            startTime: contest.startTime,
            endTime: currentEndTime,
            duration: contest.duration,
        };
        const newRating = Math.round(calculateHeuristicRating([...heuristicHistory, currentHistory]));
        return newRating;
    }
    if (contest.ratingRangeEnd <= 0) return undefined;

    const { ratingBound } = getContestRatingParameters(contest);
    const previousContests = Math.max(0, Math.floor(safeNumber(row.Competitions)));
    const roundedPerformance = Math.min(performance, ratingBound);
    const oldRating = Math.max(0, safeNumber(row.OldRating));

    if (previousContests === 0 || oldRating <= 0) {
        return adjustRating(roundedPerformance, 1);
    }

    const oldRawRating = inverseAdjustRating(oldRating, previousContests);
    if (!Number.isFinite(oldRawRating)) return undefined;
    const oldWeight = 9 * (1 - 0.9 ** previousContests);
    const rawRating = Math.log2(
        (oldWeight * 2 ** (oldRawRating / 800) + 2 ** (roundedPerformance / 800)) /
        (oldWeight + 1),
    ) * 800;
    return adjustRating(rawRating, previousContests + 1);
}

export function estimateRatingDelta(
    row: ContestStanding,
    contest: ContestRatingInfo,
    performance: number | undefined,
    heuristicHistory: readonly HeuristicRatingHistory[] = [],
): number | undefined {
    if (row.IsRated === false || (!contest.isHeuristic && contest.ratingRangeEnd <= 0)) return 0;
    const newRating = estimateNewRating(row, contest, performance, heuristicHistory);
    if (newRating === undefined) return undefined;
    return newRating - Math.max(0, safeNumber(row.OldRating));
}

export function formatSignedDelta(delta: number | undefined): string {
    if (delta === undefined || !Number.isFinite(delta)) return '—';
    if (delta === 0) return '±0';
    return `${delta > 0 ? '+' : ''}${Math.round(delta)}`;
}
