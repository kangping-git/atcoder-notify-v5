import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.render('apps/apps');
});
router.get('/users/', (req, res) => {
    res.render('apps/users');
});
router.get('/rating-simulator/', (req, res) => {
    res.render('apps/rating_simulator');
});

export default router;
