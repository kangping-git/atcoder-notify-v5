import { Main } from '..';
import { Database } from '../database';
import { Logger } from '../utils/logger';
import { ScraperContest } from './contests/crawlContest';
import cron from 'node-cron';
import { CrawlAllSubmissions, setTimeoutValue, setWindow } from './submissions/getSubmissions';
import { ScraperContestResult } from './contests/crawlContestResult';
import { nextTick } from 'process';

export namespace AtCoderScraper {
    let sessionId: string | null = null;
    export let logger: Logger;
    let crawlingContestResults = false;

    export async function initAtCoderScraper() {
        logger = Main.getLogger().child('AtCoderScraper');
        logger.info('Initializing AtCoder scraper...');

        // Get session ID from database
        const sessionRow = await Database.getDatabase().config.findUnique({
            where: { key: 'atcoder_session' },
        });
        if (sessionRow) {
            sessionId = encodeURI(sessionRow.value);
            logger.trace('Session ID found and loaded');
        } else {
            logger.fatal('Session ID not found in database');
            throw new Error('Session ID not found in database');
        }

        logger.info('AtCoder scraper initialized successfully');

        logger.info('Starting AtCoder scraper cron jobs...');
        cron.schedule('*/30 * * * * *', runEvery30Seconds, { timezone: 'Asia/Tokyo' });
        cron.schedule('*/1 * * * *', runEveryMinute, { timezone: 'Asia/Tokyo' });
        cron.schedule('0 7 * * *', runDaily, { timezone: 'Asia/Tokyo' });
        logger.info('AtCoder scraper cron jobs started successfully');
        // CrawlAllSubmissionsEvent();
        CrawlContestResults();
    }

    export async function CrawlContestResults(isNull = false) {
        if (crawlingContestResults) return;
        const contests = await Database.getDatabase().contest.findMany({
            where: {
                endTime: {
                    lte: new Date(),
                    gte: new Date(new Date().setDate(new Date().getDate() - 14)),
                },
                resultPageHash: isNull ? void 0 : null,
            },
            orderBy: { endTime: 'asc' },
        });
        const contestsUnCrawledPDF = await Database.getDatabase().contest.findMany({
            where: {
                endTime: {
                    lte: new Date(),
                },
                crawledPDF: false,
            },
            orderBy: { endTime: 'asc' },
        });
        crawlingContestResults = true;
        for (const contest of contests) {
            await ScraperContestResult.crawlContestResult(contest.id);
        }
        for (const contest of contestsUnCrawledPDF) {
            await ScraperContest.getProblemPDF(contest.id);
        }

        crawlingContestResults = false;
    }
    export async function CrawlAllSubmissionsEvent() {
        logger.info('Crawling all submissions...');
        const contests = await Database.getDatabase().contest.findMany({
            where: {
                endTime: {
                    lte: new Date(),
                },
            },
            orderBy: { endTime: 'asc' },
        });
        for (const contest of contests) {
            await CrawlAllSubmissions(contest.id);
        }
        nextTick(() => {
            logger.info('Crawling all submissions completed.');
            CrawlAllSubmissionsEvent();
        });
    }

    export function getCookie() {
        if (!sessionId) {
            logger.fatal('Session ID is not set. Please initialize the scraper first.');
            throw new Error('Session ID is not set. Please initialize the scraper first.');
        }
        return `REVEL_SESSION=${decodeURI(sessionId)}`;
    }
    function runEvery30Seconds() {
        logger.info('Running every 30 seconds...');
    }
    function runEveryMinute() {
        logger.info('Running every minute...');
        CrawlContestResults();
    }
    async function runDaily() {
        logger.info('Running daily...');
        CrawlContestResults(true);
        ScraperContest.CrawlAllContest();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const contests = await Database.getDatabase().contest.findMany({
            where: {
                OR: [
                    {
                        startTime: { gte: startOfToday, lte: endOfToday },
                        endTime: { gte: startOfToday, lte: endOfToday },
                    },
                ],
            },
        });
        if (contests.length > 0) {
            setWindow(1);
            setTimeoutValue(1000);
        } else {
            setWindow(3);
            setTimeoutValue(600);
        }
    }
}
