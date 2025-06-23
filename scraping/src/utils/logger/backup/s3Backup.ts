import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { BackupTarget } from './backupTarget.js';

export interface S3BackupOptions {
    bucket: string;
    keyPrefix?: string;
    concurrency?: number;
    s3Client?: S3Client;
}

export class S3Backup implements BackupTarget {
    private s3: S3Client;
    constructor(private opts: S3BackupOptions) {
        this.s3 = opts.s3Client ?? new S3Client({});
    }

    async backup(srcPath: string) {
        const key = (this.opts.keyPrefix ?? '') + path.basename(srcPath);

        const uploader = new Upload({
            client: this.s3,
            params: {
                Bucket: this.opts.bucket,
                Key: key,
                Body: fs.createReadStream(srcPath).pipe(new PassThrough()),
            },
            queueSize: this.opts.concurrency ?? 4,
        });

        await uploader.done();
    }
}
