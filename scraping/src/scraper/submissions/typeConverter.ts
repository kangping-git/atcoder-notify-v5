import {
    Prisma,
    SubmissionStatus as PrismaSubmissionStatus,
    SubmissionStatus,
} from '@prisma/client';
import { Main } from '../..';
import {
    Submission,
    SubmissionWithoutTimeAndMemory,
    SubmissionWithTimeAndMemory,
} from './getSubmissions';

export function convertPrismaSubmissionToScraperSubmission(
    submission: Prisma.submissionsGetPayload<{}>,
): Submission {
    if (
        submission.status === PrismaSubmissionStatus.CE ||
        submission.status === PrismaSubmissionStatus.WJ ||
        submission.status === PrismaSubmissionStatus.WR
    ) {
        return {
            status: convertPrismaSubmissionStatusToScraper(submission.status),
            contestId: submission.contestId,
            problemId: submission.problemId,
            datetime: submission.datetime,
            userId: submission.userId,
            language: submission.language,
            score: submission.score,
            codeLength: submission.codeLength,
            submissionId: submission.submissionId,
        } as SubmissionWithoutTimeAndMemory;
    }
    return {
        status: convertPrismaSubmissionStatusToScraper(submission.status),
        contestId: submission.contestId,
        problemId: submission.problemId,
        datetime: submission.datetime,
        userId: submission.userId,
        language: submission.language,
        score: submission.score,
        codeLength: submission.codeLength,
        time: submission.time,
        memory: submission.memory,
        submissionId: submission.submissionId,
    } as SubmissionWithTimeAndMemory;
}

export function convertPrismaSubmissionStatusToScraper(
    status: PrismaSubmissionStatus,
): SubmissionStatus {
    switch (status) {
        case PrismaSubmissionStatus.AC:
            return SubmissionStatus.AC;
        case PrismaSubmissionStatus.WA:
            return SubmissionStatus.WA;
        case PrismaSubmissionStatus.TLE:
            return SubmissionStatus.TLE;
        case PrismaSubmissionStatus.MLE:
            return SubmissionStatus.MLE;
        case PrismaSubmissionStatus.RE:
            return SubmissionStatus.RE;
        case PrismaSubmissionStatus.CE:
            return SubmissionStatus.CE;
        case PrismaSubmissionStatus.QLE:
            return SubmissionStatus.QLE;
        case PrismaSubmissionStatus.OLE:
            return SubmissionStatus.OLE;
        case PrismaSubmissionStatus.IE:
            return SubmissionStatus.IE;
        case PrismaSubmissionStatus.WJ:
            return SubmissionStatus.WJ;
        case PrismaSubmissionStatus.WR:
            return SubmissionStatus.WR;
        default:
            Main.getLogger().fatal(`Unhandled submission status: ${status}`);
            throw new Error(`Unhandled submission status: ${status}`);
    }
}

export function convertScraperSubmissionToPrismaSubmission(
    submission: Submission,
): Prisma.submissionsGetPayload<{}> {
    if (
        submission.status === SubmissionStatus.CE ||
        submission.status === SubmissionStatus.WJ ||
        submission.status === SubmissionStatus.WR
    ) {
        return {
            status: convertScraperSubmissionStatusToPrisma(submission.status),
            contestId: submission.contestId,
            problemId: submission.problemId,
            datetime: submission.datetime,
            userId: submission.userId,
            codeLength: submission.codeLength,
            language: submission.language,
            score: submission.score,
            time: -1,
            memory: -1,
            submissionId: submission.submissionId,
        };
    }
    const submissionWithTimeAndMemory = submission as SubmissionWithTimeAndMemory;

    return {
        status: convertScraperSubmissionStatusToPrisma(submissionWithTimeAndMemory.status),
        contestId: submissionWithTimeAndMemory.contestId,
        problemId: submissionWithTimeAndMemory.problemId,
        datetime: submissionWithTimeAndMemory.datetime,
        userId: submissionWithTimeAndMemory.userId,
        codeLength: submissionWithTimeAndMemory.codeLength,
        language: submissionWithTimeAndMemory.language,
        score: submissionWithTimeAndMemory.score,
        time: submissionWithTimeAndMemory.time,
        memory: submissionWithTimeAndMemory.memory,
        submissionId: submissionWithTimeAndMemory.submissionId,
    };
}

export function convertScraperSubmissionStatusToPrisma(
    status: SubmissionStatus,
): PrismaSubmissionStatus {
    switch (status) {
        case SubmissionStatus.AC:
            return PrismaSubmissionStatus.AC;
        case SubmissionStatus.WA:
            return PrismaSubmissionStatus.WA;
        case SubmissionStatus.TLE:
            return PrismaSubmissionStatus.TLE;
        case SubmissionStatus.MLE:
            return PrismaSubmissionStatus.MLE;
        case SubmissionStatus.RE:
            return PrismaSubmissionStatus.RE;
        case SubmissionStatus.CE:
            return PrismaSubmissionStatus.CE;
        case SubmissionStatus.QLE:
            return PrismaSubmissionStatus.QLE;
        case SubmissionStatus.OLE:
            return PrismaSubmissionStatus.OLE;
        case SubmissionStatus.IE:
            return PrismaSubmissionStatus.IE;
        case SubmissionStatus.WJ:
            return PrismaSubmissionStatus.WJ;
        case SubmissionStatus.WR:
            return PrismaSubmissionStatus.WR;
        default:
            Main.getLogger().fatal(`Unhandled submission status: ${status}`);
            throw new Error(`Unhandled submission status: ${status}`);
    }
}
