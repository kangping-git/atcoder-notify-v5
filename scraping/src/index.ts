import { Logger } from './utils/logger';
import { FileTransport } from './utils/logger/transports/fileTransport';
import { LogLevel } from './utils/logger/types';
import { ConsoleTransport } from './utils/logger/transports/consoleTransport';
import { Database } from './database';
import { AtCoderScraper } from './scraper/atcoderScraper';
import { Proxy } from './proxy/proxy';
import http from 'http';

export namespace Main {
    let logger: Logger | null = null;
    export async function init() {
        // Initialize the logger
        logger = new Logger();
        logger.addTransport(new FileTransport('./logs/[date].app.log', LogLevel.TRACE, {}));
        logger.addTransport(new ConsoleTransport(LogLevel.INFO));

        // Start Background tasks
        logger.info('Starting background tasks...');
        Proxy.initProxy(process.env.SOCK5_PROXY!);
        await Database.initDatabase();
        await AtCoderScraper.initAtCoderScraper();
        createProxyServer();
        logger.info('Background tasks started.');
    }
    export function getLogger(): Logger {
        if (!logger) {
            throw new Error('Logger not initialized. Call init() first.');
        }
        return logger;
    }
    function createProxyServer() {
        if (!process.env.SOCK5_PROXY) {
            throw new Error('SOCK5_PROXY environment variable is not set');
        }
        const baseURL = 'https://atcoder.jp';
        const server = http.createServer((req, res) => {
            const url = new URL(req.url!, baseURL);
            if (req.method == 'GET') {
                const get = Proxy.get(url.href, AtCoderScraper.getCookie());
                get.then((response) => {
                    res.end(response.data);
                }).catch((error) => {
                    logger?.error(`Error in GET request: ${error}`);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                });
            } else {
                res.writeHead(405, { 'Content-Type': 'text/plain' });
                res.end('Method Not Allowed');
            }
        });
        server.listen(process.env.PROXY_PORT);
    }
}

Main.init();
