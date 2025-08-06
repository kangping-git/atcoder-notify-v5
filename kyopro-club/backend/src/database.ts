import { PrismaClient } from '@prisma/client';

export namespace Database {
    let database: PrismaClient | null = null;

    export function initDatabase(): void {
        if (!database) {
            database = new PrismaClient({});
        }
    }
    export function getDatabase(): PrismaClient {
        if (!database) {
            throw new Error('Database not initialized. Call initDatabase() first.');
        }
        return database;
    }
}
