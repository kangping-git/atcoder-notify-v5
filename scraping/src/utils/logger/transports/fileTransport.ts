import fs from 'node:fs';
import path from 'node:path';
import { Transport, LogLevel } from '../types.js';
import type { BackupTarget } from '../backup/backupTarget.js';

export interface FileTransportOptions {
    dateFormat?: (d: Date) => string; // [date] 置換
    backup?: BackupTarget; // 任意のバックアップ実装
}

export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private currentPath: string;

    constructor(
        private filePattern: string, // 例: logs/app-[date].log
        public minLevel: LogLevel = LogLevel.TRACE,
        private opts: FileTransportOptions = {},
    ) {
        this.currentPath = this.resolvePath(new Date());
        fs.mkdirSync(path.dirname(this.currentPath), { recursive: true });
        this.stream = fs.createWriteStream(this.currentPath, { flags: 'a' });
    }

    async log(level: LogLevel, time: Date, msg: string) {
        if (level < this.minLevel) return;

        const expected = this.resolvePath(time);
        if (expected !== this.currentPath) {
            await this.rotate(expected);
        }

        this.stream.write(`${time.toISOString()} ${msg}\n`);
    }

    /* ---------- private ---------- */

    private resolvePath(d: Date) {
        const fmt = this.opts.dateFormat ?? ((x) => x.toISOString().slice(0, 10));
        return this.filePattern.replace(/\[date\]/gi, fmt(d));
    }

    private async rotate(nextPath: string) {
        await new Promise<void>((res) => this.stream.end(res));

        if (this.opts.backup) {
            try {
                await this.opts.backup.backup(this.currentPath);
            } catch (e) {
                console.error('[Backup] failed:', e);
            }
        }

        this.currentPath = nextPath;
        fs.mkdirSync(path.dirname(nextPath), { recursive: true });
        this.stream = fs.createWriteStream(nextPath, { flags: 'a' });
    }
}
