import { Router } from 'express';
import { getHistoryImage, getUserRatingImage } from './images/history';
import sharp, { bool } from 'sharp';
import { boolean, z } from 'zod';
import { Database } from '../../database';
sharp.cache({
    memory: 200,
    files: 0,
    items: 0,
});

const router = Router();

router.get(['/', '/count', '/histogram'], async (req, res) => {
    const QuerySchema = z.object({
        q: z.string().optional(),
        country: z.string().optional(),
        minAlgo: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().optional()),
        maxAlgo: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().optional()),
        minHeuristic: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().optional()),
        maxHeuristic: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().optional()),
        sort: z.enum(['algoRating', 'heuristicRating', 'name', '-algoRating', '-heuristicRating', '-name']).default('algoRating'),
        limit: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().min(1).max(200).default(50)),
        cursor: z.string().optional(),
        isActive: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return Boolean(val);
            return undefined;
        }, z.boolean().optional()),
    });
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
        res.status(400).json({ error: 'Invalid query parameters', details: query.error.errors });
        return;
    }
    let { sort, limit, cursor, q, country, minAlgo, maxAlgo, minHeuristic, maxHeuristic, isActive } = query.data;
    const isAsc = !sort.startsWith('-');
    const sortField0 = sort.replace('-', '');
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (req.path == '/count') {
        const baseWhere: any = {
            name: q ? { contains: q } : undefined,
            country: country || undefined,
            algoRating: { gte: minAlgo, lte: maxAlgo },
            heuristicRating: { gte: minHeuristic, lte: maxHeuristic },
            lastContestTime: isActive ? { gte: twoYearsAgo } : undefined,
        };
        const count = await Database.getDatabase().user.count({ where: baseWhere });
        res.json({ count });
        return;
    }
    if (req.path == '/histogram') {
        const baseWhere: any = {
            name: q ? { contains: q } : undefined,
            country: country || undefined,
            algoRating: { gte: minAlgo, lte: maxAlgo },
            heuristicRating: { gte: minHeuristic, lte: maxHeuristic },
            lastContestTime: isActive ? { gte: twoYearsAgo } : undefined,
        };
        const algoHistogram = await Database.getDatabase().user.groupBy({
            by: ['algoRating'],
            where: baseWhere,
            _count: true,
        });
        const heuristicHistogram = await Database.getDatabase().user.groupBy({
            by: ['heuristicRating'],
            where: baseWhere,
            _count: true,
        });
        res.json({ algoHistogram, heuristicHistogram });
        return;
    }

    let decoded: any = null;
    if (cursor) {
        try {
            decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
        } catch {
            res.status(400).json({ error: 'Invalid cursor' });
            return;
        }
    }

    const baseWhere: any = {
        name: q ? { contains: q } : undefined,
        country: country || undefined,
        algoRating: { gte: minAlgo, lte: maxAlgo },
        heuristicRating: { gte: minHeuristic, lte: maxHeuristic },
        lastContestTime: isActive ? { gte: twoYearsAgo } : undefined,
    };

    let cursorFilter: any = {};
    if (decoded) {
        if (sortField0 === 'algoRating') {
            cursorFilter = {
                OR: [
                    { algoRating: { lt: decoded.algoRating } },
                    {
                        algoRating: { equals: decoded.algoRating },
                        name: { gt: decoded.name },
                    },
                ],
            };
        } else if (sortField0 === 'heuristicRating') {
            cursorFilter = {
                OR: [
                    { heuristicRating: { lt: decoded.heuristicRating } },
                    {
                        heuristicRating: { equals: decoded.heuristicRating },
                        name: { gt: decoded.name },
                    },
                ],
            };
        } else {
            cursorFilter = { name: { [isAsc ? 'gt' : 'lt']: decoded.name } };
        }
    }

    let orderBy: any[];
    if (sortField0 === 'name') {
        orderBy = [{ name: isAsc ? 'asc' : 'desc' }];
    } else {
        orderBy = [{ [sortField0]: isAsc ? 'asc' : 'desc' }, { name: 'asc' }];
    }

    const users = await Database.getDatabase().user.findMany({
        where: { ...baseWhere, ...cursorFilter },
        orderBy,
        select: {
            name: true,
            country: true,
            algoRating: true,
            heuristicRating: true,
        },
        take: limit,
    });

    let nextCursor: string | null = null;
    if (users.length === limit) {
        const last = users[users.length - 1] as {
            name: string;
            algoRating: number;
            heuristicRating: number;
            [key: string]: any;
        };
        const payload: any = { name: last.name };
        if (sortField0 !== 'name' && (sortField0 === 'algoRating' || sortField0 === 'heuristicRating')) {
            payload[sortField0] = last[sortField0];
        }
        nextCursor = Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    res.json({ users, nextCursor });
});
router.get('/:name', async (req, res) => {
    const { name } = req.params;
    if (!name) {
        res.status(400).json({ error: 'User name is required' });
        return;
    }
    const userData = await Database.getDatabase().user.findUnique({
        where: { name },
        select: {
            name: true,
            country: true,
            algoRating: true,
            heuristicRating: true,
            algoAPerf: true,
            heuristicAPerf: true,
            lastContestTime: true,
        },
    });
    if (!userData) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json(userData);
});
router.get('/:name/stats', async (req, res) => {
    const { name } = req.params;
    if (!name) {
        res.status(400).json({ error: 'User name is required' });
        return;
    }
    const db = Database.getDatabase();

    // 並列クエリを減らして高速化
    const [submissions, ratingEvents] = await Promise.all([
        db.submissions.findMany({
            where: { user: { name } },
            orderBy: { datetime: 'asc' },
        }),
        db.userRatingChangeEvent.findMany({
            where: { user: { name } },
            orderBy: { newRating: 'desc' },
            select: { newRating: true, isHeuristic: true },
        }),
    ]);
    const ContestCount = ratingEvents.length;
    const maxAlgoRating = ratingEvents.find((e) => !e.isHeuristic) || null;
    const maxHeuristicRating = ratingEvents.find((e) => e.isHeuristic) || null;
    const firstAC = submissions.find((s) => s.status === 'AC') || null;
    const submissionCount = submissions.length;
    const ACCount = submissions.filter((s) => s.status === 'AC').length;
    res.json({
        submissionCount,
        ACCount,
        ContestCount,
        firstAC: firstAC ? firstAC.datetime : null,
        maxAlgoRating: maxAlgoRating ? maxAlgoRating.newRating : null,
        maxHeuristicRating: maxHeuristicRating ? maxHeuristicRating.newRating : null,
    });
});
router.get('/:name/history', async (req, res) => {
    const { name } = req.params;
    if (!name) {
        res.status(400).json({ error: 'User name is required' });
        return;
    }
    const db = Database.getDatabase();
    const history = await db.userRatingChangeEvent.findMany({
        where: { user: { name } },
        orderBy: {
            contest: {
                endTime: 'asc',
            },
        },
        select: {
            oldRating: true,
            newRating: true,
            isHeuristic: true,
            contestId: true,
            contest: true,
            performance: true,
            InnerPerformance: true,
            place: true,
        },
    });
    res.json(history);
});

router.get(['/:name/submissions', '/:name/submissions/count'], async (req, res) => {
    const { name } = req.params;
    const QuerySchema = z.object({
        contestId: z.string().optional(),
        problemId: z.string().optional(),
        status: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return val.toUpperCase();
            return void 0;
        }, z.enum(['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE', 'QLE', 'OLE', 'IE', 'WJ', 'WR']).optional()),
        language: z.string().optional(),
        since: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return new Date(val);
            return undefined;
        }, z.date().optional()),
        until: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return new Date(val);
            return undefined;
        }, z.date().optional()),
        cursor: z.string().optional(),
        limit: z.preprocess((val) => {
            if (typeof val === 'string' && val !== '') return parseInt(val, 10);
            return undefined;
        }, z.number().min(1).max(200).default(50)),
    });
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
        res.status(400).json({ error: 'Invalid query parameters', details: query.error.errors });
        return;
    }
    const { contestId, problemId, status, language, since, until, cursor, limit } = query.data;
    const where: any = {
        userId: name,
        contestId: contestId || undefined,
        problemId: problemId || undefined,
        status: status || undefined,
        language: {
            contains: language || undefined,
        },
    };
    if (cursor) {
        try {
            where.submissionId = {
                lt: BigInt(Buffer.from(cursor, 'base64').toString('utf8')),
            };
        } catch {
            res.status(400).json({ error: 'Invalid cursor' });
            return;
        }
    }
    if (since) {
        where.datetime = { gte: since };
    }
    if (until) {
        where.datetime = { ...where.datetime, lte: until };
    }
    if (req.path.endsWith('/count')) {
        const count = await Database.getDatabase().submissions.count({ where });
        res.json({ count });
        return;
    }
    const data = await Database.getDatabase().submissions.findMany({
        where,
        orderBy: [{ submissionId: 'desc' }],
        take: limit,
        select: {
            submissionId: true,
            contestId: true,
            problemId: true,
            status: true,
            codeLength: true,
            datetime: true,
            language: true,
            memory: true,
            time: true,
            score: true,
            userId: true,
        },
    });
    if (data.length === 0) {
        res.json({ submissions: [], nextCursor: null });
        return;
    }
    const nextCursor = data.length == limit ? Buffer.from(data[limit - 1].submissionId.toString()).toString('base64') : null;
    res.json({
        submissions: data.slice(0, limit).map((sub) =>
            Object.assign(sub, {
                submissionId: String(sub.submissionId),
            }),
        ),
        nextCursor,
    });
});
router.get('/:name/submissions/:submissionId', async (req, res) => {
    const { name, submissionId } = req.params;
    if (!name || !submissionId) {
        res.status(400).json({ error: 'User name and submission ID are required' });
        return;
    }
    const submission: any = await Database.getDatabase().submissions.findUnique({
        where: {
            userId: name,
            submissionId: BigInt(submissionId),
        },
        select: {
            submissionId: true,
            contestId: true,
            problemId: true,
            status: true,
            codeLength: true,
            datetime: true,
            contest: true,
            language: true,
            memory: true,
            time: true,
            score: true,
            user: true,
            userId: true,
        },
    });
    if (submission) {
        submission.submissionId = submission.submissionId.toString();
    }
    res.json(submission);
});

router.get(['/:name/rating.svg', '/:name/rating.png'], async (req, res) => {
    const { name } = req.params;
    const { isHeuristic, withPerformance, withSubmissions } = req.query;
    const svg = await getUserRatingImage(name, isHeuristic === 'true', withPerformance === 'true', withSubmissions === 'true');
    if (req.path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
        const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
        res.send(pngBuffer);
        return;
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});
router.get(['/:name/ratingGraph.svg', '/:name/ratingGraph.png'], async (req, res) => {
    const { name } = req.params;
    const { isHeuristic, withPerformance, withSubmissions } = req.query;
    const svg = await getHistoryImage(name, isHeuristic === 'true', withPerformance === 'true', withSubmissions === 'true');
    if (req.path.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
        const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
        res.send(pngBuffer);
        return;
    }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
});

export default router;
