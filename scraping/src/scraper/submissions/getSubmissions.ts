import { Proxy } from '../../proxy/proxy';
import { AtCoderScraper } from '../atcoderScraper';
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import { convertScraperSubmissionToPrismaSubmission } from './typeConverter';
import { Database } from '../../database';
import { AxiosError } from 'axios';

let window = 3;
let timeout = 1000;
export async function CrawlAllSubmissions(contest: string): Promise<void> {
    return new Promise<void>(async (resolve) => {
        let page = 0;
        let isFinished = false;
        AtCoderScraper.logger.info(`Crawling submissions for contest ${contest}...`);

        const waitingJudges = new Set(
            (
                await Database.getDatabase().submissions.findMany({
                    where: {
                        contestId: contest,
                        status: {
                            in: ['WR', 'WJ'],
                        },
                        datetime: {
                            gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
                        },
                    },
                })
            ).map((v) => v.submissionId),
        );
        AtCoderScraper.logger.info(`Get all waiting submissions...`);
        async function runWorker(workerId: number) {
            if (workerId >= window) {
                return;
            }
            page += 1;
            const isFinishedFromWorker = await CrawlSubmissionWorker(contest, page, waitingJudges);
            if (isFinishedFromWorker && !isFinished) {
                isFinished = true;
                resolve();
            }
            if (!isFinished) {
                setTimeout(() => runWorker(workerId), timeout);
            }
        }
        for (let i = 0; i < window; i++) {
            runWorker(i);
        }
    });
}
export function setWindow(newWindow: number) {
    if (newWindow < 1) {
        throw new Error('Window size must be at least 1');
    }
    window = newWindow;
    AtCoderScraper.logger.info(`Changed window size to ${window}`);
}
export function setTimeoutValue(newTimeout: number) {
    if (newTimeout < 0) {
        throw new Error('Timeout must be at least 0');
    }
    timeout = newTimeout;
    AtCoderScraper.logger.info(`Changed timeout to ${timeout}`);
}
async function CrawlSubmissionWorker(
    contest: string,
    page: number,
    waitingJudges: Set<bigint>,
): Promise<boolean> {
    const submissions = await getSubmissionPage(contest, page);
    if (submissions.length === 0) {
        return true;
    }
    const submissionIds = submissions.map((submission) => submission.submissionId);
    const existingSubmissions = await Database.getDatabase().submissions.findMany({
        where: {
            contestId: contest,
            submissionId: { in: submissionIds },
        },
    });
    const existingSubmissionIds = new Set(
        existingSubmissions.map((submission) => submission.submissionId),
    );
    const unknownSubmissions = submissions.filter(
        (submission) => !existingSubmissionIds.has(submission.submissionId),
    );
    for (const submission of submissions) {
        const prismaSubmission = convertScraperSubmissionToPrismaSubmission(submission);
        try {
            await Database.getDatabase().user.upsert({
                where: { name: submission.userId },
                create: { name: submission.userId },
                update: {},
            });
            await Database.getDatabase().submissions.upsert({
                where: {
                    submissionId: submission.submissionId,
                },
                create: prismaSubmission,
                update: prismaSubmission,
            });
        } catch (e) {
            AtCoderScraper.logger.error(`Failed to upsert submission ${submission.submissionId}`, {
                error: e,
            });
        }
        waitingJudges.delete(submission.submissionId);
    }
    if (waitingJudges.size > 0 || unknownSubmissions.length > 0) {
        return false;
    }
    return true;
}

export enum SubmissionStatus {
    AC = 'AC',
    WA = 'WA',
    TLE = 'TLE',
    MLE = 'MLE',
    RE = 'RE',
    CE = 'CE',
    QLE = 'QLE',
    OLE = 'OLE',
    IE = 'IE',
    WJ = 'WJ',
    WR = 'WR',
}
export type SubmissionWithTimeAndMemory = {
    status:
        | SubmissionStatus.AC
        | SubmissionStatus.WA
        | SubmissionStatus.TLE
        | SubmissionStatus.MLE
        | SubmissionStatus.RE
        | SubmissionStatus.QLE
        | SubmissionStatus.OLE;
    contestId: string;
    problemId: string;
    datetime: Date;
    userId: string;
    language: string;
    score: number;
    codeLength: number;
    time: number;
    memory: number;
    submissionId: bigint;
};
export type SubmissionWithoutTimeAndMemory = {
    status: SubmissionStatus.CE | SubmissionStatus.WJ | SubmissionStatus.WR | SubmissionStatus.IE;
    contestId: string;
    problemId: string;
    datetime: Date;
    userId: string;
    language: string;
    score: number;
    codeLength: number;
    submissionId: bigint;
};
export type Submission = SubmissionWithoutTimeAndMemory | SubmissionWithTimeAndMemory;

export async function getSubmissionPage(contest: string, page: number) {
    const url = `https://atcoder.jp/contests/${contest}/submissions?page=${page}`;
    const maxRetries = 50;
    let retryCount = 0;
    let response;
    while (retryCount < maxRetries) {
        try {
            response = await Proxy.get(url, AtCoderScraper.getCookie());
            if (response.status >= 500 && response.status < 600) {
                retryCount++;
                AtCoderScraper.logger.info(
                    `Received ${response.status}, retrying attempt ${retryCount}/${maxRetries}`,
                );
                continue;
            }
            break;
        } catch (e) {
            retryCount++;
            AtCoderScraper.logger.info(
                `Received Error, retrying attempt ${retryCount}/${maxRetries}`,
            );
            if (e instanceof AxiosError) {
                if (e.response && e.response.status == 404) {
                    break;
                }
            }
            continue;
        }
    }
    if (!response || response.status !== 200) {
        AtCoderScraper.logger.error('Failed to fetch submission page', {
            status: response ? response.status : 'undefined',
        });
        return [];
    }
    const $ = cheerio.load(response.data);
    const rows = $('div.panel-submission table tbody tr').toArray();
    return rows.map((val) => analyzeSubmission(val));
}
/**
 * Helper to map status text to SubmissionStatus enum.
 */
export function parseSubmissionStatus(statusText: string): SubmissionStatus {
    const statusMapping: { [key: string]: SubmissionStatus } = {
        AC: SubmissionStatus.AC,
        WA: SubmissionStatus.WA,
        TLE: SubmissionStatus.TLE,
        MLE: SubmissionStatus.MLE,
        RE: SubmissionStatus.RE,
        QLE: SubmissionStatus.QLE,
        OLE: SubmissionStatus.OLE,
        CE: SubmissionStatus.CE,
        WJ: SubmissionStatus.WJ,
        WR: SubmissionStatus.WR,
    };
    const status = statusMapping[statusText];
    if (!status) {
        return SubmissionStatus.WJ;
    }
    return status;
}

/**
 * Parses submission details from a given table row element.
 */
export function analyzeSubmission(row: Element): Submission {
    // Load the row element into cheerio to allow DOM selection.
    const $ = cheerio.load(row);
    const cells = $('td').toArray();

    // Parse the common fields
    const datetime = new Date($(cells[0]).find('time').text().trim());

    const taskLink = $(cells[1]).find('a').attr('href') || '';
    const taskParts = taskLink.split('/');
    const contestId = taskParts[2];
    const problemId = taskParts[4];

    const userParts = $(cells[2]).find('a').first().attr('href') || '';
    const userId = userParts.split('/')[2];
    const language = $(cells[3]).find('a').text().trim();

    const score = Number($(cells[4]).text().trim());
    const submissionId = BigInt($(cells[4]).attr('data-id') || '0');

    const codeLengthText = $(cells[5]).text().trim();
    const codeLength = parseInt(codeLengthText.split(' ')[0], 10);

    const statusText = $(cells[6]).find('span').text().trim();
    const status = parseSubmissionStatus(statusText);

    // For submissions with CE, WJ or WR status
    if (
        status === SubmissionStatus.CE ||
        status === SubmissionStatus.WJ ||
        status === SubmissionStatus.WR ||
        status === SubmissionStatus.IE
    ) {
        return {
            status,
            contestId,
            problemId,
            datetime,
            userId,
            language,
            score,
            codeLength,
            submissionId,
        };
    } else {
        // For successful/failed submissions, parse additional fields.
        const timeText = $(cells[7]).text().replace('ms', '').trim();
        const time = parseInt(timeText, 10);
        const memoryText = $(cells[8]).text().replace('KB', '').trim();
        const memory = parseInt(memoryText, 10);
        return {
            status,
            contestId,
            problemId,
            datetime,
            userId,
            language,
            score,
            codeLength,
            time,
            memory,
            submissionId,
        };
    }
}
export async function getSubmission(contestId: string, submissionId: string) {
    const url = `https://atcoder.jp/contests/${contestId}/submissions/${submissionId}`;
    const response = await Proxy.get(url, AtCoderScraper.getCookie());
    if (response.status !== 200) {
        AtCoderScraper.logger.error(`Failed to fetch submission ${submissionId}`, {
            status: response.status,
        });
        return null;
    }
    const $ = cheerio.load(response.data);
    const code = $('#submission-code').text().trim();

    // Parse the submission info panel.
    const info: Partial<Submission> & { time?: number; memory?: number } = {};
    $('div.panel.panel-default table.table-bordered tr').each((_, row) => {
        const header = $(row).find('th').first().text().trim();
        const cell = $(row).find('td').first();
        switch (header) {
            case '提出日時': {
                // The time text is inside a <time> element.
                const timeText = cell.find('time').text().trim();
                info.datetime = new Date(timeText);
                break;
            }
            case '問題': {
                // Example href: "/contests/dp/tasks/dp_i"
                const href = cell.find('a').attr('href') || '';
                const parts = href.split('/');
                info.contestId = parts[2] || contestId;
                info.problemId = parts[4] || '';
                break;
            }
            case 'ユーザ': {
                const href = cell.find('a').attr('href') || '';
                info.userId = href.split('/')[2] || cell.text().trim();
                break;
            }
            case '言語': {
                info.language = cell.text().trim();
                break;
            }
            case '得点': {
                info.score = Number(cell.text().trim());
                break;
            }
            case 'コード長': {
                // "553 Byte" -> 553
                const parts = cell.text().trim().split(' ');
                info.codeLength = parseInt(parts[0], 10);
                break;
            }
            case '結果': {
                const statusText = cell.find('span').text().trim();
                info.status = parseSubmissionStatus(statusText);
                if (
                    !(
                        info.status === SubmissionStatus.CE ||
                        info.status === SubmissionStatus.WJ ||
                        info.status === SubmissionStatus.WR ||
                        info.status === SubmissionStatus.IE
                    )
                ) {
                    // For successful/failed submissions, parse additional fields.
                    const timeText = cell.next().find('td').text().replace('ms', '').trim();
                    info.time = parseInt(timeText, 10);
                    const memoryText = cell
                        .next()
                        .next()
                        .find('td')
                        .text()
                        .replace('KB', '')
                        .trim();
                    info.memory = parseInt(memoryText, 10);
                }
                break;
            }
        }
    });

    // (Optionally, attach the code if you need it later)
    // info.code = code;

    if (
        info.status === SubmissionStatus.CE ||
        info.status === SubmissionStatus.WJ ||
        info.status === SubmissionStatus.WR ||
        info.status === SubmissionStatus.IE
    ) {
        return {
            ...info,
            submissionId: BigInt(submissionId),
        } as SubmissionWithoutTimeAndMemory;
    } else {
        return {
            ...info,
            submissionId: BigInt(submissionId),
        } as SubmissionWithTimeAndMemory;
    }
}
