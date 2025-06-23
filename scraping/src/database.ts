import { PrismaClient } from '@prisma/client';
import { Logger } from './utils/logger';
import { Main } from '.';

export namespace Database {
    let database: PrismaClient | null = null;
    let logger: Logger;

    export function initDatabase(): void {
        logger = Main.getLogger().child('Database');
        logger.info('Initializing database...');
        logger.info('Connecting to database...');
        if (!database) {
            database = new PrismaClient({});
        }
        database
            .$connect()
            .then(() => {
                logger.info('Database connected successfully.');
            })
            .catch((error) => {
                logger.error('Error connecting to database:', error);
            });
    }
    export function getDatabase(): PrismaClient {
        if (!database) {
            logger.fatal('Database not initialized. Call initDatabase() first.');
            throw new Error('Database not initialized. Call initDatabase() first.');
        }
        return database;
    }
}
