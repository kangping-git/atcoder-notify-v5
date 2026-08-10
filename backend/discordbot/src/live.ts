import { EventSource } from 'eventsource';
import { Database } from './database';
import { client } from '.';
import { EmbedBuilder } from 'discord.js';

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
    datetime: string;
    username: string;
    language: string;
    score: number;
    codeLength: number;
    time: number;
    memory: number;
    submissionId: string;
};
export type SubmissionWithoutTimeAndMemory = {
    status: SubmissionStatus.CE | SubmissionStatus.WJ | SubmissionStatus.WR | SubmissionStatus.IE;
    contestId: string;
    problemId: string;
    datetime: string;
    username: string;
    language: string;
    score: number;
    codeLength: number;
    submissionId: string;
};
export type Submission = SubmissionWithoutTimeAndMemory | SubmissionWithTimeAndMemory;

const sseURL = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}/sse/`;

export async function connectSSE() {
    const sse = new EventSource(sseURL);
    sse.addEventListener('open', () => {
        console.log(`Connected to submission SSE at ${sseURL}`);
    });
    sse.addEventListener('error', (error) => {
        console.error('Submission SSE connection error:', error);
    });
    sse.addEventListener('contestResultCrawled', (ev) => {
        void handleContestResult(ev.data).catch((error) => {
            console.error('Failed to handle contest result event:', error);
        });
    });
    sse.addEventListener('submission', (ev) => {
        void handleSubmission(ev.data).catch((error) => {
            console.error('Failed to handle submission event:', error);
        });
    });
}

async function handleContestResult(rawData: string) {
    const data: {
        contestId: string;
        results: {
            userName: string;
            place: number;
            oldRating: number;
            newRating: number;
            performance: number;
        };
    } = JSON.parse(rawData);
    await Database.getDatabase().discordServerConfig.findMany({
        select: {
            linkedUsers: true,
        },
    });
}

async function handleSubmission(rawData: string) {
    const data = JSON.parse(rawData) as Submission;
    if (!data.username) {
        throw new Error('Submission event is missing username');
    }
    if (data.status == 'WJ' || data.status == 'WR') {
        return;
    }
    const servers = await Database.getDatabase().discordServerConfig.findMany({
        where: {
            linkedUsers: {
                some: {
                    AtCoderUser: {
                        name: data.username,
                    },
                },
            },
            ac_notify_channel: {
                not: null,
            },
        },
    });
    let submissionEmbed = new EmbedBuilder()
        .setTitle('提出結果通知')
        .addFields([
            {
                name: 'コンテスト',
                value: '`' + data.contestId + '`',
                inline: true,
            },
            {
                name: '問題',
                value: '`' + data.problemId + '`',
                inline: true,
            },
            {
                name: '提出時刻',
                value: `<t:${Math.floor(new Date(data.datetime).getTime() / 1000)}>`,
                inline: true,
            },
            {
                name: '提出結果',
                value: '`' + data.status + '`',
                inline: true,
            },
            {
                name: 'スコア',
                value: '`' + data.score + '`',
                inline: true,
            },
            {
                name: '言語',
                value: '`' + data.language + '`',
                inline: true,
            },
            {
                name: 'コード長',
                value: '`' + data.codeLength + ' B`',
                inline: true,
            },
        ])
        .setURL(`https://atcoder.jp/contests/${data.contestId}/submissions/${data.submissionId}`)
        .setColor('Orange')
        .setAuthor({
            name: data.username,
        });
    if (data.status == 'AC') {
        submissionEmbed = submissionEmbed.setColor('Green');
    }
    if (data.status !== 'CE' && data.status !== 'IE') {
        const data2 = data as SubmissionWithTimeAndMemory;
        submissionEmbed = submissionEmbed.addFields([
            {
                name: '使用メモリ',
                value: '`' + data2.memory + ' KiB`',
                inline: true,
            },
            {
                name: '時間',
                value: '`' + data2.time + ' ms`',
                inline: true,
            },
        ]);
    }
    await Promise.all(
        servers.map(async (server) => {
            let channel = client.channels.cache.get(server.ac_notify_channel!);
            if (!channel) {
                channel = await client.channels.fetch(server.ac_notify_channel!);
            }
            if (!channel) return;
            if (!channel.isSendable()) return;

            await channel.send({
                embeds: [submissionEmbed],
            });
        }),
    );
}
