import { Router } from 'express';
import { getHistoryImage, getUserRatingImage } from './images/history';
import sharp from 'sharp';

const router = Router();

sharp.cache({
    memory: 200,
    files: 0,
    items: 0,
});

router.get('/', (req, res) => {});
router.get('/users', async (req, res) => {
    const { q = '', country = void 0, minAlgo, maxAlgo, minHeuristic, maxHeuristic, sort = 'algoRating', limit = 50, cursor } = req.query;
});
router.get('/users/:name/', (req, res) => {});

router.get('/users/:name/submissions', (req, res) => {});
router.get('/users/:name/submissions/:submissionId', (req, res) => {});

router.get('/users/:name/history', (req, res) => {});

router.get(['/users/:name/rating.svg', '/users/:name/rating.png'], async (req, res) => {
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
router.get(['/users/:name/ratingGraph.svg', '/users/:name/ratingGraph.png'], async (req, res) => {
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
router.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

export default router;
