import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.render('judge/main');
});

export default router;
