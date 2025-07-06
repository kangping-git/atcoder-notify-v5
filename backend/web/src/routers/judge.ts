import { randomUUID } from 'crypto';
import { Router } from 'express';
import { createClient } from 'redis';

const router = Router();

let redisClient: ReturnType<typeof createClient>;
function connectRedisServer() {
    redisClient = createClient({
        url: 'redis://127.0.0.1:6379',
    });
    return new Promise((resolve, reject) => {
        redisClient.on('error', (err) => {
            reject(err);
        });
        redisClient.on('ready', () => {
            resolve(redisClient);
        });
        redisClient.connect().catch(reject);
    });
}

router.get('/', (req, res) => {
    res.render('judge/main');
});
router.get('/submit/sample', async (req, res) => {
    if (!redisClient) {
        await connectRedisServer();
    }
    const sampleData = {
        language: 'python3.12',
        code: `
print("Hello, World!")
`,
        problemId: 'sample-problem',
        contestId: 'sample-contest',
        judgementId: randomUUID(),
    };
    await redisClient.rPush('judgement', JSON.stringify(sampleData));
    res.end('Sample submission sent to the judge queue.');
});

export default router;
