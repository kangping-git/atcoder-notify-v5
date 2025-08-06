import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import expressSession from 'express-session';
import { PrismaStore } from './prisma-session';
import logger from 'morgan';
config({ path: path.join(__dirname, '../../../../.env') });

const app = express();
app.use(logger('dev'));
const PORT = process.env.KYOPRO_CLUB_PORT || 3000;

// 開発環境設定
if (process.env.NODE_ENV === 'development') {
    app.locals.isDevelopment = true;
} else {
    app.locals.isDevelopment = false;
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../frontend/views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const prisma = new PrismaClient();
app.use('/static', express.static(path.join(__dirname, '../../frontend/dist')));
app.use('/public', express.static(path.join(__dirname, '../../frontend/public')));
app.use('/', express.static(path.join(__dirname, '../../frontend/favicon')));

app.use(
    expressSession({
        cookie: {
            maxAge: 31 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            domain: process.env.DOMAIN,
            path: '/',
        },
        secret: process.env.SESSION_SECRET_KEY || 'secret',
        resave: true,
        saveUninitialized: true,
        store: new PrismaStore(prisma, {
            removeInterval: 60 * 60 * 1000,
        }),
    }),
);
app.use((req, res, next) => {
    const startTime = performance.now();

    res.setHeader('X-Powered-By', 'Kangping');
    res.setHeader('X-Programming-Language', 'BrainFuck');
    res.setHeader('X-Server-Name', 'BrainFuck Super Server');
    res.setHeader('X-Server-Version', '1.0.0');
    res.setHeader('X-Server-Framework', 'Express.bf');
    const oldSend = res.send.bind(res);
    res.send = (body?: any) => {
        const duration = performance.now() - startTime;
        res.setHeader('X-Response-Time', `${duration.toFixed(5)}ms`);
        return oldSend(body);
    };
    next();
});

app.use((req, res, next) => {
    res.locals.userName = null;
    res.locals.isAuthenticated = false;
    if (req.session && req.session.user) {
        res.locals.userName = req.session.user.name;
        res.locals.isAuthenticated = true;
    }
    next();
});

import homeRouter from './router/home';
app.use('/', homeRouter);
import accountsRouter from './router/accounts';
app.use('/accounts/', accountsRouter);

import { responseError } from './error';
import { Database } from './database';
app.use((req, res) => {
    responseError(404, res, req);
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction): void => {
    console.error(err);
    responseError(500, res, req);
});

app.listen(PORT, async () => {
    Database.initDatabase();
    console.log(`Server is running at http://localhost:${PORT}`);
});
