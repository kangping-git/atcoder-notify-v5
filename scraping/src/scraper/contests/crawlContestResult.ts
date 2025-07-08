import { Main } from '../..';
import { Database } from '../../database';
import { Proxy } from '../../proxy/proxy';
import { AtCoderScraper } from '../atcoderScraper';
import crypto from 'crypto';

interface AtCoderResult {
    IsRated: boolean;
    Place: number;
    OldRating: number;
    NewRating: number;
    Performance: number;
    ContestName: string;
    ContestNameEn: string;
    ContestScreenName: string;
    EndTime: string;
    ContestType: number;
    UserName: string;
    UserScreenName: string;
    Country: string;
    Affiliation: string;
    Rating: number;
    Competitions: number;
    AtCoderRank: number;
}
interface AtCoderUserPerformance {
    IsRated: boolean;
    Place: number;
    OldRating: number;
    NewRating: number;
    Performance: number;
    InnerPerformance: number;
    ContestScreenName: string;
    ContestName: string;
    ContestNameEn: string;
    EndTime: string;
}

export namespace ScraperContestResult {
    let algoUserPageCache: Map<string, AtCoderUserPerformance[]> = new Map();
    let heuristicPageCache: Map<string, AtCoderUserPerformance[]> = new Map();

    export async function crawlContestResult(contestId: string) {
        const contestData = await Database.getDatabase().contest.findUnique({
            where: {
                id: contestId,
            },
        });
        if (!contestData) {
            AtCoderScraper.logger.error(`Contest ${contestId} not found in database.`);
            return;
        }
        if (contestData.ratingRangeEnd <= 0) {
            AtCoderScraper.logger.warn(`Contest ${contestId} is not rated, skipping result crawl.`);
            return;
        }
        const contestResultURL = `https://atcoder.jp/contests/${contestId}/results/json`;
        const response = await Proxy.get(contestResultURL, AtCoderScraper.getCookie());
        if (!response || !response.data) {
            AtCoderScraper.logger.error(`Failed to fetch contest results for ${contestId}.`);
            return;
        }
        const results: AtCoderResult[] = response.data;
        if (!Array.isArray(results) || results.length === 0) {
            AtCoderScraper.logger.warn(`No results found for contest ${contestId}.`);
            return;
        }
        const responseHash = crypto
            .createHash('sha256')
            .update(
                JSON.stringify(
                    results.map((r) => {
                        return {
                            IsRated: r.IsRated,
                            Place: r.Place,
                            OldRating: r.OldRating,
                            NewRating: r.NewRating,
                            Performance: r.Performance,
                            UserName: r.UserName,
                        };
                    }),
                ),
            )
            .digest('hex');
        if (contestData.resultPageHash === responseHash) {
            AtCoderScraper.logger.info(`No new results for contest ${contestId}, skipping update.`);
            return;
        }
        await Database.getDatabase().userRatingChangeEvent.deleteMany({
            where: {
                contestId: contestId,
            },
        });
        await Database.getDatabase().contest.update({
            where: {
                id: contestId,
            },
            data: {
                resultPageHash: responseHash,
            },
        });
        AtCoderScraper.logger.info(`Crawled results for contest ${contestId}, updating database.`);
        const userIds = new Map<string, number>();
        const users = await Database.getDatabase().user.findMany();
        for (const user of users) {
            userIds.set(user.name.toLowerCase(), user.id);
        }

        for (const result of results) {
            let { OldRating, NewRating, Performance, UserScreenName, IsRated } = result;
            if (!IsRated) {
                continue;
            }
            if (Performance === contestData.ratingRangeEnd + 401) {
                let temporaryPerformance = await getUserPerformanceFromUserPage(UserScreenName, contestId, contestData.isHeuristic);
                if (temporaryPerformance === null) {
                    AtCoderScraper.logger.warn(`Failed to fetch performance for user ${UserScreenName} in contest ${contestId}.`);
                    continue;
                }
                Performance = temporaryPerformance;
            }
            let userId = userIds.get(UserScreenName.toLowerCase());
            if (!userId) {
                userId = (
                    await Database.getDatabase().user.create({
                        data: {
                            name: UserScreenName,
                            country: result.Country,
                            lastContestTime: new Date(result.EndTime),
                            algoRating: contestData.isHeuristic ? void 0 : result.NewRating,
                            algoAPerf: contestData.isHeuristic ? void 0 : Performance,
                            heuristicRating: contestData.isHeuristic ? result.NewRating : void 0,
                            heuristicAPerf: contestData.isHeuristic ? Performance : void 0,
                        },
                    })
                ).id;
            } else {
                const performances = await Database.getDatabase().userRatingChangeEvent.findMany({
                    where: {
                        userId: userId,
                        isHeuristic: contestData.isHeuristic,
                    },
                });
                let aperf = Performance;
                if (performances.length > 0) {
                    performances.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
                    const performanceValues = performances.map((p) => p.InnerPerformance);
                    let Aperf = 0;
                    let Count = 0;
                    const reversedHistory = [...performanceValues].reverse();
                    for (const change of reversedHistory) {
                        Count += 1;
                        Aperf += change * 0.9 ** Count;
                    }
                    if (Count > 0) {
                        Aperf /= 9 * (1 - 0.9 ** Count);
                    }
                    aperf = Aperf;
                }
                await Database.getDatabase().user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        lastContestTime: new Date(result.EndTime),
                        algoRating: contestData.isHeuristic ? void 0 : result.NewRating,
                        heuristicRating: contestData.isHeuristic ? result.NewRating : void 0,
                        algoAPerf: contestData.isHeuristic ? void 0 : aperf,
                        heuristicAPerf: contestData.isHeuristic ? aperf : void 0,
                    },
                });
            }
            if (userId === undefined) {
                throw new Error(`userId for ${UserScreenName} should not be undefined`);
            }
            await Database.getDatabase().user.update({
                where: {
                    id: userId,
                },
                data: {
                    country: result.Country,
                },
            });
            await Database.getDatabase().userRatingChangeEvent.create({
                data: {
                    contestId: contestId,
                    userId: userId,
                    oldRating: OldRating,
                    newRating: NewRating,
                    performance: result.Performance,
                    InnerPerformance: Performance,
                    isHeuristic: contestData.isHeuristic,
                    updatedAt: new Date(result.EndTime),
                    place: result.Place,
                },
            });
        }
        Main.sendEvent('contestResultCrawled', {
            contestId: contestId,
            results: results.map((r) => ({
                userName: r.UserScreenName,
                place: r.Place,
                oldRating: r.OldRating,
                newRating: r.NewRating,
                performance: r.Performance,
            })),
        });
        AtCoderScraper.logger.info(`Successfully crawled results for contest ${contestId}, ${results.length} users processed.`);
    }
    async function getUserPerformanceFromUserPage(user: string, contestId: string, isHeuristic: boolean) {
        AtCoderScraper.logger.info(`Fetching user performance for ${user} in contest ${contestId}.`);
        const cache = isHeuristic ? heuristicPageCache : algoUserPageCache;
        if (cache.has(user)) {
            const userData = cache.get(user);
            if (userData && userData.find((u) => u.ContestScreenName === `${contestId}.contest.atcoder.jp`)) {
                return userData.find((u) => u.ContestScreenName === `${contestId}.contest.atcoder.jp`)!.InnerPerformance;
            }
        }
        const query = isHeuristic ? 'contestType=heuristic' : 'contestType=algo';
        const userPageURL = `https://atcoder.jp/users/${user}/history/json?${query}`;
        const response = await Proxy.get(userPageURL, AtCoderScraper.getCookie());
        if (!response || !response.data) {
            AtCoderScraper.logger.error(`Failed to fetch user page for ${user}.`);
            return null;
        }
        const userResults: AtCoderUserPerformance[] = response.data;
        if (!Array.isArray(userResults) || userResults.length === 0) {
            AtCoderScraper.logger.warn(`No results found for user ${user} in contest ${contestId}.`);
            return null;
        }
        const userPerformance = userResults.find((u) => u.ContestScreenName === `${contestId}.contest.atcoder.jp`);
        if (!userPerformance) {
            AtCoderScraper.logger.warn(`No performance data found for user ${user} in contest ${contestId}.`);
            return null;
        }
        if (isHeuristic) {
            heuristicPageCache.set(user, userResults);
        } else {
            algoUserPageCache.set(user, userResults);
        }
        return userPerformance.InnerPerformance;
    }
}
