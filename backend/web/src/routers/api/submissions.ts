import { Router, Response as ExpressResponse } from 'express';
import { z } from 'zod';
import { EventSource } from 'eventsource';

const MasterSSE = new EventSource(`http://localhost:${process.env.PROXY_PORT || 3002}/sse/`);

const router = Router();

router.get('/', (req, res) => {});

MasterSSE.addEventListener('message', (event) => {
    sseConnections.forEach((res) => {
        res.write(`data: ${event.data}\n\n`);
    });
});
const sseConnections = new Set<ExpressResponse>();
router.get('/sse', (req, res) => {
    res.setTimeout(2 ** 31 - 1);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write('\n');
    sseConnections.add(res);
    res.on('close', () => {
        sseConnections.delete(res);
        res.end();
    });
});

export default router;
