import { Router } from 'express';
import usersAPI from './api/users';
import submissionsAPI from './api/submissions';
import taskAPI from './api/task';

const router = Router();

router.get('/', (req, res) => {});
router.use('/users', usersAPI);
router.use('/submissions', submissionsAPI);
router.use('/task', taskAPI);
router.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found' });
});

export default router;
