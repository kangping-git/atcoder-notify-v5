import express from 'express';
import { config } from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import expressSession from 'express-session';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PrismaStore } from './prisma-session';
import logger from 'morgan';
config({ path: path.join(__dirname, '../../../.env') });

const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
});
const app = express();
app.use(logger('dev'));
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../../frontend/views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const prisma = new PrismaClient();
app.use(
    expressSession({
        cookie: {
            maxAge: 31 * 24 * 60 * 60 * 1000,
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
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/static', express.static(path.join(__dirname, '../../../frontend/dist/')));

app.use((req, res, next) => {
    res.locals.userName = null;
    res.locals.isAuthenticated = false;
    if (req.session && req.session.user) {
        res.locals.userName = req.session.user.name;
        res.locals.isAuthenticated = true;
    }
    next();
});

import mainRouter from './routers/main';
app.use('/', mainRouter);
import accountsRouter from './routers/accounts';
// app.use('/accounts', accountsRouter);
import appsRouter from './routers/apps';
app.use('/apps', appsRouter);
import apiRouter from './routers/api';
app.use('/api/v1', apiRouter);
import judgeRouter from './routers/judge';
// app.use('/judge', judgeRouter);

import { responseError } from './error';
import { Database } from './database';
import mcp from './mcp';
app.all('/mcp', async (req, res) => {
    try {
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});
app.use((req, res) => {
    responseError(404, res, req);
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction): void => {
    console.error(err);
    responseError(500, res, req);
});

app.listen(PORT, async () => {
    await mcp.connect(transport);
    Database.initDatabase();
    console.log(`Server is running at http://localhost:${PORT}`);
});
