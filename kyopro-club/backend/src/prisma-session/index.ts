import { KickyUser, PrismaClient, SessionData as PrismaSessionData } from '@prisma/client';
import { Store } from 'express-session';

type SessionDataExtends = PrismaSessionData & { cookie: any };
type SessionDataExtendsWithUser = SessionDataExtends & { user: KickyUser | null };
declare module 'express-session' {
    interface SessionData extends SessionDataExtendsWithUser {}
}

export class PrismaStore extends Store {
    prismaClient: PrismaClient;
    constructor(prismaClient: PrismaClient, options?: { removeInterval?: number }) {
        super();
        this.prismaClient = prismaClient;
        if (options) {
            if (options.removeInterval) {
                setInterval(() => {
                    this.prismaClient.sessionData
                        .deleteMany({
                            where: {
                                expiresAt: {
                                    lt: new Date(),
                                },
                            },
                        })
                        .catch((err) => {
                            console.error('Error deleting expired sessions', err);
                        });
                }, options.removeInterval);
            }
        }
    }
    get(
        sid: string,
        callback: (err: any, session?: SessionDataExtendsWithUser | null) => void,
    ): void {
        this.prismaClient.sessionData
            .findUnique({
                where: {
                    sid: sid,
                },
                include: {
                    user: true,
                },
            })
            .then((session) => {
                if (session) {
                    callback(
                        null,
                        Object.assign(
                            { cookie: { originalMaxAge: 60 * 60 * 1000 * 24 * 31 } },
                            session,
                        ) as SessionDataExtendsWithUser,
                    );
                } else {
                    callback(null, null);
                }
            })
            .catch((err) => {
                callback(err);
            });
    }
    set(sid: string, session: SessionDataExtends, callback?: (err?: any) => void): void {
        const { cookie, ...sessionData } = session;
        const { user, ...sessionDataWithoutUser } = sessionData as SessionDataExtendsWithUser;

        this.prismaClient.sessionData
            .upsert({
                where: {
                    sid: sid,
                },
                update: sessionDataWithoutUser,
                create: Object.assign(
                    { sid, expiresAt: new Date(cookie.expires ?? Date.now()) },
                    sessionDataWithoutUser,
                ),
            })
            .then(() => {
                if (callback) callback();
            })
            .catch((err) => {
                if (callback) callback(err);
            });
    }
    destroy(sid: string, callback?: (err?: any) => void): void {
        this.prismaClient.sessionData
            .delete({
                where: {
                    sid: sid,
                },
            })
            .then(() => {
                if (callback) callback();
            })
            .catch((err) => {
                if (callback) callback(err);
            });
    }
}
