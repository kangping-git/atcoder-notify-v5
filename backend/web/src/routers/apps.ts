import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.render('apps/apps');
});
router.get('/users/', (req, res) => {
    res.render('apps/users');
});

export default router;
