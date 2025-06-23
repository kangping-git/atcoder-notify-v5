import { createTools, jsonResponse } from '.';
import { Database } from '../database';
import { z } from 'zod';

export default createTools([
    {
        name: 'getContestList',
        description: 'Get contest list in AtCoder',
        schema: {
            page: z
                .number()
                .int()
                .describe(
                    'Page number for pagination. Contests are retrieved in order from the newest, with 50 contests per page.',
                )
                .default(1),
            orderBy: z
                .enum(['startTime', 'duration'])
                .default('startTime')
                .describe('Order by which the contests are sorted.'),
            q: z.string().min(1).max(100).optional().describe('Search query for contest names.'),
            contestType: z
                .enum(['ABC', 'ARC', 'AGC', 'AHC', 'All'])
                .default('All')
                .describe('Type of contest to filter by.'),
        },
        handler: async (args) => {
            const page = args.page;
            const contests = await Database.getDatabase().contest.findMany({
                orderBy: { [args.orderBy]: 'desc' },
                skip: (page - 1) * 50,
                take: 50,
                where: {
                    contestType: args.contestType === 'All' ? undefined : args.contestType,
                    title: {
                        contains: args.q,
                    },
                },
            });
            return jsonResponse(contests);
        },
    },
]);
