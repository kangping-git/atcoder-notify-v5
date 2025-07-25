import { Database } from '../database';

export async function rebuildUsersTable() {
    let cursor = 0;
    const batchSize = 1000;
    const contestEndTimes = new Map<string, Date>();
    const contests = await Database.getDatabase().contest.findMany();
    for (const contest of contests) {
        contestEndTimes.set(contest.id, contest.endTime);
    }
    while (true) {
        const users = await Database.getDatabase().user.findMany({
            where: {
                id: {
                    gte: cursor,
                },
            },
            take: batchSize,
            orderBy: {
                id: 'asc',
            },
            select: {
                ratings: true,
                country: true,
                id: true,
            },
        });
        if (users.length === 0) {
            break;
        }
        for (const user of users) {
            const history = user.ratings;
            history.sort((a, b) => contestEndTimes.get(a.contestId)!.getTime() - contestEndTimes.get(b.contestId)!.getTime());
            if (user.id == 18353) {
                console.log(history);
            }
            let algoRating = -1;
            let heuristicRating = -1;
            for (const change of history) {
                if (change.isHeuristic) {
                    heuristicRating = change.newRating;
                } else {
                    algoRating = change.newRating;
                }
            }

            let APerfAlgo = 0;
            let APerfHeuristic = 0;
            let AlgoCount = 0;
            let HeuristicCount = 0;
            const reversedHistory = [...history].reverse();
            for (const change of reversedHistory) {
                if (change.isHeuristic) {
                    HeuristicCount += 1;
                    APerfHeuristic += change.InnerPerformance * 0.9 ** HeuristicCount;
                } else {
                    AlgoCount += 1;
                    APerfAlgo += change.InnerPerformance * 0.9 ** AlgoCount;
                }
            }
            if (AlgoCount > 0) {
                APerfAlgo /= 9 * (1 - 0.9 ** AlgoCount);
            }
            if (HeuristicCount > 0) {
                APerfHeuristic /= 9 * (1 - 0.9 ** HeuristicCount);
            }

            await Database.getDatabase().user.update({
                where: {
                    id: user.id,
                },
                data: {
                    algoRating: algoRating,
                    heuristicRating: heuristicRating,
                    lastContestTime: history.length > 0 ? contestEndTimes.get(history[history.length - 1].contestId) : null,
                    algoAPerf: APerfAlgo,
                    heuristicAPerf: APerfHeuristic,
                    country: user.country,
                },
            });
            await Database.getDatabase().userRatingChangeEvent.deleteMany({
                where: {
                    userId: user.id,
                },
            });
            for (const change of history) {
                await Database.getDatabase().userRatingChangeEvent.create({
                    data: {
                        contestId: change.contestId,
                        userId: user.id,
                        oldRating: change.oldRating,
                        newRating: change.newRating,
                        performance: change.performance,
                        InnerPerformance: change.InnerPerformance,
                        isHeuristic: change.isHeuristic,
                        updatedAt: contestEndTimes.get(change.contestId) || new Date(),
                    },
                });
            }
        }
        cursor = users[users.length - 1].id + 1;
        console.log(`Processed ${cursor} users`);
    }
}
