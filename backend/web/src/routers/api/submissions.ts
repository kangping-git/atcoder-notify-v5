import { Router, Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { EventSource } from 'eventsource';
import { Database } from '../../database';

let MasterSSE: EventSource;
const sseUrl = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT || 3002}/sse/`;

function createMasterSSE() {
    if (MasterSSE) {
        MasterSSE.close();
    }
    MasterSSE = new EventSource(sseUrl);

    MasterSSE.addEventListener('open', () => {
        console.log('[MasterSSE] connection opened');
    });

    MasterSSE.addEventListener('submission', (event) => {
        console.log('[MasterSSE] received:', event.data);
        sseConnections.forEach((res) => res.write(`data: ${event.data}\n\n`));
    });

    MasterSSE.addEventListener('error', (err) => {
        console.error('[MasterSSE] error:', err);
        MasterSSE.close();
        setTimeout(createMasterSSE, 3000);
    });
}

createMasterSSE();

const router = Router();

router.get('/', async (req, res) => {
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
        user: z.string().optional(),
    });
    const query = QuerySchema.safeParse(req.query);
    if (!query.success) {
        res.status(400).json({ error: 'Invalid query parameters', details: query.error.errors });
        return;
    }
    const { user, contestId, problemId, status, language, since, until, cursor, limit } = query.data;
    const where: any = {
        user: { name: user },
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
    const db = Database.getDatabase();
    const data = await db.submissions.findMany({
        where,
        orderBy: [{ submissionId: 'desc' }],
        take: limit,
        select: {
            submissionId: true,
            status: true,
            codeLength: true,
            datetime: true,
            language: true,
            memory: true,
            time: true,
            score: true,
            user: true,
            task: true
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
                problemId: String(sub.task.taskid),
                contestId: String(sub.task.contestid),
            }),
        ),
        nextCursor,
    });
});
const sseConnections = new Set<ExpressResponse>();
router.get('/live', (req, res) => {
    res.setTimeout(2 ** 31 - 1);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(': ping\n\n');
    sseConnections.add(res);
    res.on('close', () => {
        sseConnections.delete(res);
    });
});
router.get('/:submissionId', async (req, res) => {
    const { submissionId } = req.params;
    if (!submissionId) {
        res.status(400).json({ error: 'User name and submission ID are required' });
        return;
    }
    const submission: any = await Database.getDatabase().submissions.findUnique({
        where: {
            submissionId: BigInt(submissionId),
        },
        select: {
            submissionId: true,
            task: {
                include: {
                    contest: true,
                }
            },
            status: true,
            codeLength: true,
            datetime: true,
            language: true,
            memory: true,
            time: true,
            score: true,
            user: true,
        },
    });
    if (submission) {
        submission.submissionId = submission.submissionId.toString();
        submission.problemId = submission.task.taskid;
        submission.contestId = submission.task.contestid;
        submission.contest = submission.task.contest;
    }
    res.json(submission);
});

export default router;
