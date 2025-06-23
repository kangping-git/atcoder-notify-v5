import { Router } from 'express';
import { getHistoryImage, getUserRatingImage } from './images/history';
import sharp from 'sharp';
import { z } from 'zod';
import { Database } from '../../database';
sharp.cache({
    memory: 200,
    files: 0,
    items: 0,
});

const router = Router();

router.get(['/', '/count'], async (req, res) => {
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
    });
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
        res.status(400).json({ error: 'Invalid query parameters', details: query.error.errors });
        return;
    }
    const { sort, limit, cursor, q, country, minAlgo, maxAlgo, minHeuristic, maxHeuristic } = query.data;
    const isAsc = !sort.startsWith('-');
    const sortField0 = sort.replace('-', '');
    if (req.path == '/count') {
        const baseWhere: any = {
            name: q ? { contains: q } : undefined,
            country: country || undefined,
            algoRating: { gte: minAlgo, lte: maxAlgo },
            heuristicRating: { gte: minHeuristic, lte: maxHeuristic },
        };
        const count = await Database.getDatabase().user.count({ where: baseWhere });
        res.json({ count });
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
            id: true,
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
router.get('/:name/', async (req, res) => {
    const { name } = req.params;
    if (!name) {
        res.status(400).json({ error: 'User name is required' });
        return;
    }
    const userData = await Database.getDatabase().user.findUnique({
        where: { name },
        select: {
            id: true,
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

    const [submissionCount, ACCount, ContestCount, firstAC, maxAlgoRating, maxHeuristicRating] = await Promise.all([
        db.submissions.count({
            where: { user: { name } },
        }),
        db.submissions.count({
            where: { user: { name }, status: 'AC' },
        }),
        db.userRatingChangeEvent.count({
            where: { user: { name } },
        }),
        db.submissions.findFirst({
            where: { user: { name }, status: 'AC' },
            orderBy: { datetime: 'asc' },
        }),
        db.userRatingChangeEvent.findFirst({
            where: { user: { name }, isHeuristic: false },
            orderBy: { newRating: 'desc' },
        }),
        db.userRatingChangeEvent.findFirst({
            where: { user: { name }, isHeuristic: true },
            orderBy: { newRating: 'desc' },
        }),
    ]);
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
        },
    });
    res.json(history);
});

router.get('/:name/submissions', (req, res) => {});
router.get('/:name/submissions/:submissionId', (req, res) => {});

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
