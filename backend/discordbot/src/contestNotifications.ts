import cron from 'node-cron';
import sharp from 'sharp';
import {
    AttachmentBuilder,
    Client,
    EmbedBuilder,
    Message,
} from 'discord.js';
import { Database } from './database';
import {
    clipDifficulty,
    ContestStanding,
    ContestStandingsPayload,
    ContestTask,
    estimateDifficulty,
    estimatePerformances,
    estimateRatingDelta,
    formatSignedDelta,
    getTaskResult,
    HeuristicRatingHistory,
} from './contestRating';

const JST = 'Asia/Tokyo';
const PROXY_BASE_URL = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
const PROBLEM_MODELS_URL = 'https://kenkoooo.com/atcoder/resources/problem-models.json';

type ContestRecord = {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    isHeuristic: boolean;
    contestType: string;
    ratingRangeBegin: number;
    ratingRangeEnd: number;
};

type NotificationServer = {
    id: string;
    contest_notify_channel: string | null;
    linkedUsers: Array<{ AtCoderUser: { name: string } }>;
};

type LiveMessageState = {
    channelId: string;
    messageId: string;
};

type ProblemModel = {
    difficulty?: number;
};

let schedulerStarted = false;
let problemModelsCache: Record<string, ProblemModel> = {};
let problemModelsFetchedAt = 0;

function escapeXml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
        switch (character) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            default: return '&apos;';
        }
    });
}

function ratingColor(rating: number) {
    if (rating >= 2800) return '#e60000';
    if (rating >= 2400) return '#ff8c00';
    if (rating >= 2000) return '#c0c000';
    if (rating >= 1600) return '#2040d0';
    if (rating >= 1200) return '#00a0a0';
    if (rating >= 800) return '#008000';
    if (rating >= 400) return '#804000';
    return '#666666';
}

function formatDiscordTime(value: Date) {
    return `<t:${Math.floor(value.getTime() / 1000)}:f>`;
}

function jstDateText(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: JST,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

function getJstDayRange(date: Date) {
    const start = new Date(`${jstDateText(date)}T00:00:00+09:00`);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

async function readConfig<T>(key: string): Promise<T | undefined> {
    const row = await Database.getDatabase().config.findUnique({ where: { key } });
    if (!row) return undefined;
    try {
        return JSON.parse(row.value) as T;
    } catch {
        return undefined;
    }
}

async function writeConfig(key: string, value: unknown) {
    await Database.getDatabase().config.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
    });
}

async function getServers(): Promise<NotificationServer[]> {
    return Database.getDatabase().discordServerConfig.findMany({
        where: { contest_notify_channel: { not: null } },
        select: {
            id: true,
            contest_notify_channel: true,
            linkedUsers: {
                select: {
                    AtCoderUser: { select: { name: true } },
                },
            },
        },
    });
}

async function getSendableChannel(client: Client, channelId: string): Promise<any | undefined> {
    const channel = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isSendable()) return undefined;
    return channel;
}

async function fetchContestStandings(contestId: string): Promise<ContestStandingsPayload | undefined> {
    const url = `${PROXY_BASE_URL}/api/contests/${encodeURIComponent(contestId)}/standings/json?lang=en`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`standings request returned ${response.status}`);
        const payload = await response.json() as ContestStandingsPayload;
        if (!Array.isArray(payload.StandingsData)) throw new Error('standings response has no StandingsData');
        return payload;
    } catch (error) {
        console.error(`Failed to fetch live standings for ${contestId}:`, error);
        return undefined;
    }
}

async function fetchProblemModels() {
    if (Date.now() - problemModelsFetchedAt < 60 * 60 * 1000) return problemModelsCache;
    problemModelsFetchedAt = Date.now();
    try {
        const response = await fetch(PROBLEM_MODELS_URL);
        if (!response.ok) throw new Error(`problem models request returned ${response.status}`);
        const value = await response.json();
        problemModelsCache = value && typeof value === 'object' ? value as Record<string, ProblemModel> : {};
    } catch (error) {
        console.error('Failed to fetch AtCoderProblems problem models:', error);
        problemModelsCache = {};
    }
    return problemModelsCache;
}

async function fetchAveragePerformances(rows: ContestStanding[], isHeuristic: boolean) {
    const names = [...new Set(rows.map((row) => row.UserScreenName).filter(Boolean))];
    if (names.length === 0) return new Map<string, number>();
    const users = await Database.getDatabase().user.findMany({
        where: { name: { in: names } },
        select: { name: true, algoAPerf: true, heuristicAPerf: true },
    });
    const result = new Map<string, number>();
    for (const user of users) {
        const averagePerformance = isHeuristic ? user.heuristicAPerf : user.algoAPerf;
        if (averagePerformance !== null && Number.isFinite(averagePerformance)) {
            result.set(user.name.toLowerCase(), averagePerformance);
        }
    }
    return result;
}

async function fetchHeuristicHistories(names: string[]) {
    const normalizedNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    const result = new Map<string, HeuristicRatingHistory[]>();
    if (normalizedNames.length === 0) return result;

    const events = await Database.getDatabase().userRatingChangeEvent.findMany({
        where: {
            isHeuristic: true,
            isRated: true,
            user: { name: { in: normalizedNames } },
        },
        orderBy: { updatedAt: 'asc' },
        select: {
            InnerPerformance: true,
            user: { select: { name: true } },
            contest: { select: { startTime: true, endTime: true, duration: true } },
        },
    });
    for (const event of events) {
        const key = event.user.name.toLowerCase();
        const history = result.get(key) ?? [];
        history.push({
            performance: event.InnerPerformance,
            startTime: event.contest.startTime,
            endTime: event.contest.endTime,
            duration: event.contest.duration,
        });
        result.set(key, history);
    }
    return result;
}

function taskLabel(task: ContestTask, index: number) {
    return task.Assignment || task.TaskName || String.fromCharCode(65 + index);
}

function problemDifficulty(
    rows: ContestStanding[],
    task: ContestTask,
    models: Record<string, ProblemModel>,
) {
    const liveDifficulty = estimateDifficulty(rows, task);
    if (liveDifficulty !== undefined) return liveDifficulty;
    const model = models[task.TaskScreenName];
    return model?.difficulty === undefined ? undefined : clipDifficulty(model.difficulty);
}

function problemCell(row: ContestStanding | undefined, task: ContestTask) {
    const result = row ? getTaskResult(row, task) : undefined;
    if (!result || (result.Count ?? 0) === 0) return '-';
    if (result.Status === 1 || (result.Score ?? 0) > 0) return 'AC';
    return `${result.Failure ?? result.Count ?? 0}×`;
}

function renderStandingsSvg(
    contest: ContestRecord,
    payload: ContestStandingsPayload,
    linkedNames: string[],
    models: Record<string, ProblemModel>,
    averagePerformances: ReadonlyMap<string, number>,
    heuristicHistories: ReadonlyMap<string, readonly HeuristicRatingHistory[]>,
) {
    const tasks = payload.TaskInfo ?? [];
    const rows = payload.StandingsData ?? [];
    const contestInfo = {
        contestType: contest.contestType,
        isHeuristic: contest.isHeuristic,
        startTime: contest.startTime,
        endTime: contest.endTime,
        duration: contest.duration,
        ratingRangeBegin: contest.ratingRangeBegin,
        ratingRangeEnd: contest.ratingRangeEnd,
    };
    const performanceMap = estimatePerformances(rows, contestInfo, averagePerformances);
    const rowsByName = new Map(rows.map((row) => [row.UserScreenName.toLowerCase(), row]));
    const userRows = [...new Set(linkedNames.map((name) => name.trim()).filter(Boolean))].map((name) => {
        const row = rowsByName.get(name.toLowerCase());
        const performance = row ? performanceMap.get(name.toLowerCase()) : undefined;
        return {
            name,
            row,
            performance,
            ratingDelta: row ? estimateRatingDelta(row, contestInfo, performance, heuristicHistories.get(name.toLowerCase()) ?? []) : undefined,
        };
    });

    const difficulties = tasks.map((task) => problemDifficulty(rows, task, models));
    const problemWidth = 74;
    const widths = [64, 190, 90, ...tasks.map(() => problemWidth), 115, 95];
    const xPositions: number[] = [];
    widths.reduce((x, width) => {
        xPositions.push(x);
        return x + width;
    }, 0);
    const width = widths.reduce((sum, value) => sum + value, 0) + 24;
    const headerHeight = 108;
    const rowHeight = 32;
    const height = Math.max(180, headerHeight + Math.max(1, userRows.length) * rowHeight + 16);
    const parts: string[] = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        `<text x="18" y="26" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#222">${escapeXml(contest.title)}</text>`,
        `<text x="18" y="49" font-family="Arial, sans-serif" font-size="13" fill="#555">暫定順位（登録ユーザー） / 1分ごと更新 / ${escapeXml(jstDateText(new Date()))}</text>`,
        `<text x="${width - 18}" y="26" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#555">終了 ${escapeXml(contest.endTime.toLocaleString('ja-JP', { timeZone: JST }))}</text>`,
        `<rect x="0" y="${headerHeight - 1}" width="${width}" height="1" fill="#999"/>`,
    ];

    const headers = ['順位', 'ユーザー', 'Score', ...tasks.map((task, index) => `${taskLabel(task, index)}\n${difficulties[index] === undefined ? '—' : `~${difficulties[index]}`}`), 'Perf.', 'ΔRate'];
    headers.forEach((header, index) => {
        const x = xPositions[index] + widths[index] / 2;
        const lines = header.split('\n');
        lines.forEach((line, lineIndex) => {
            const isDifficulty = index >= 3 && index < 3 + tasks.length && lineIndex === 1;
            parts.push(`<text x="${x}" y="${headerHeight - 34 + lineIndex * 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${isDifficulty ? 12 : 13}" font-weight="bold" fill="${isDifficulty ? ratingColor(difficulties[index - 3] ?? 0) : '#333'}">${escapeXml(line)}</text>`);
        });
    });

    userRows.forEach((entry, rowIndex) => {
        const y = headerHeight + rowIndex * rowHeight;
        if (rowIndex % 2 === 1) parts.push(`<rect x="0" y="${y}" width="${width}" height="${rowHeight}" fill="#f5f7fa"/>`);
        const row = entry.row;
        const rank = row?.Rank && row.Rank > 0 ? String(row.Rank) : '—';
        const score = row?.TotalResult?.Score === undefined ? '0' : String(row.TotalResult.Score);
        const values = [rank, entry.name, score, ...tasks.map((task) => problemCell(row, task)), entry.performance === undefined ? '—' : `~${entry.performance}`, row ? formatSignedDelta(entry.ratingDelta) : '—'];
        values.forEach((value, index) => {
            const textX = index === 1 ? xPositions[index] + 10 : xPositions[index] + widths[index] / 2;
            const anchor = index === 1 ? 'start' : 'middle';
            let fill = '#333';
            if (index === 1 && row?.OldRating !== undefined) fill = ratingColor(row.OldRating);
            if (index === 3 + tasks.length && entry.performance !== undefined) fill = ratingColor(entry.performance);
            if (index === 4 + tasks.length && entry.ratingDelta !== undefined) fill = entry.ratingDelta > 0 ? '#087f23' : entry.ratingDelta < 0 ? '#c62828' : '#555';
            parts.push(`<text x="${textX}" y="${y + rowHeight / 2 + 1}" text-anchor="${anchor}" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="13" fill="${fill}">${escapeXml(value)}</text>`);
        });
    });

    if (userRows.length === 0) {
        parts.push(`<text x="${width / 2}" y="${headerHeight + 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#777">登録ユーザーがいません</text>`);
    }
    parts.push('</svg>');
    return parts.join('');
}

async function sendDailyContestSummary() {
    const now = new Date();
    const { start, end } = getJstDayRange(now);
    const contests = await Database.getDatabase().contest.findMany({
        where: {
            startTime: { lt: end },
            endTime: { gte: start },
        },
        orderBy: { startTime: 'asc' },
        select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            duration: true,
            isHeuristic: true,
            contestType: true,
            ratingRangeBegin: true,
            ratingRangeEnd: true,
        },
    }) as ContestRecord[];
    if (contests.length === 0) return;

    const servers = await getServers();
    const marker = `discord:daily-contests:${jstDateText(now)}`;
    for (const server of servers) {
        if (!server.contest_notify_channel) continue;
        const key = `${marker}:${server.id}`;
        if (await readConfig<boolean>(key)) continue;
        const channel = await getSendableChannel(activeClient!, server.contest_notify_channel);
        if (!channel) continue;
        const description = contests.map((contest) => {
            const kind = contest.isHeuristic ? 'Ⓗ' : 'Ⓐ';
            return `${kind} **${contest.title}** — ${formatDiscordTime(contest.startTime)}〜${formatDiscordTime(contest.endTime)}\n<https://atcoder.jp/contests/${contest.id}>`;
        }).join('\n\n');
        await channel.send({
            embeds: [new EmbedBuilder().setTitle(`本日のコンテスト（${jstDateText(now)}）`).setDescription(description).setColor('#3f51b5')],
        });
        await writeConfig(key, true);
    }
}

async function sendOneHourNotifications() {
    const now = new Date();
    const contests = await Database.getDatabase().contest.findMany({
        where: {
            startTime: { gt: now, lte: new Date(now.getTime() + 60 * 60 * 1000) },
        },
        orderBy: { startTime: 'asc' },
        select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            duration: true,
            isHeuristic: true,
            contestType: true,
            ratingRangeBegin: true,
            ratingRangeEnd: true,
        },
    }) as ContestRecord[];
    if (contests.length === 0) return;

    const servers = await getServers();
    for (const contest of contests) {
        for (const server of servers) {
            if (!server.contest_notify_channel) continue;
            const key = `discord:one-hour:${server.id}:${contest.id}`;
            if (await readConfig<boolean>(key)) continue;
            const channel = await getSendableChannel(activeClient!, server.contest_notify_channel);
            if (!channel) continue;
            const kind = contest.isHeuristic ? 'ヒューリスティック' : 'アルゴリズム';
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`コンテスト開始まで1時間：${contest.title}`)
                    .setDescription(`${kind}コンテストがまもなく始まります。\n開始: ${formatDiscordTime(contest.startTime)}\n<https://atcoder.jp/contests/${contest.id}>`)
                    .setColor('#ff9800')],
            });
            await writeConfig(key, true);
        }
    }
}

async function updateLiveStandings() {
    const now = new Date();
    const contests = await Database.getDatabase().contest.findMany({
        where: { startTime: { lte: now }, endTime: { gt: now } },
        orderBy: { startTime: 'asc' },
        select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            duration: true,
            isHeuristic: true,
            contestType: true,
            ratingRangeBegin: true,
            ratingRangeEnd: true,
        },
    }) as ContestRecord[];
    if (contests.length === 0) return;

    const servers = (await getServers()).filter((server) => server.contest_notify_channel && server.linkedUsers.length > 0);
    if (servers.length === 0) return;
    const models = await fetchProblemModels();

    for (const contest of contests) {
        const payload = await fetchContestStandings(contest.id);
        if (!payload) continue;
        const averagePerformances = await fetchAveragePerformances(payload.StandingsData ?? [], contest.isHeuristic);
        const linkedNames = [...new Set(servers.flatMap((server) => server.linkedUsers.map((linked) => linked.AtCoderUser.name)))];
        const heuristicHistories = contest.isHeuristic
            ? await fetchHeuristicHistories(linkedNames)
            : new Map<string, HeuristicRatingHistory[]>();
        for (const server of servers) {
            const serverLinkedNames = server.linkedUsers.map((linked) => linked.AtCoderUser.name);
            const svg = renderStandingsSvg(contest, payload, serverLinkedNames, models, averagePerformances, heuristicHistories);
            let png: Buffer;
            try {
                png = await sharp(Buffer.from(svg)).png().toBuffer();
            } catch (error) {
                console.error(`Failed to render live standings image for ${contest.id}:`, error);
                continue;
            }
            const channel = await getSendableChannel(activeClient!, server.contest_notify_channel!);
            if (!channel) continue;
            const stateKey = `discord:live:${server.id}:${contest.id}`;
            const state = await readConfig<LiveMessageState>(stateKey);
            const attachment = new AttachmentBuilder(png, { name: `contest-${contest.id}.png` });
            const content = `📊 **${contest.title}** — 暫定順位\n最終更新: ${formatDiscordTime(new Date())}`;
            let message: Message | undefined;
            if (state?.channelId === server.contest_notify_channel) {
                message = await channel.messages.fetch(state.messageId).catch(() => undefined);
            }
            if (message) {
                await message.edit({ content, files: [attachment] });
            } else {
                message = await channel.send({ content, files: [attachment] });
            }
            if (!message) continue;
            await writeConfig(stateKey, { channelId: server.contest_notify_channel, messageId: message.id });
        }
    }
}

let activeClient: Client | undefined;

export function startContestNotifications(client: Client) {
    if (schedulerStarted) return;
    schedulerStarted = true;
    activeClient = client;

    const minuteTick = async () => {
        try {
            await sendOneHourNotifications();
            await updateLiveStandings();
        } catch (error) {
            console.error('Contest notification tick failed:', error);
        }
    };

    cron.schedule('* * * * *', () => {
        void minuteTick();
    }, { timezone: JST });
    cron.schedule('0 7 * * *', () => {
        void sendDailyContestSummary().catch((error) => console.error('Daily contest notification failed:', error));
    }, { timezone: JST });
    void minuteTick();
}
