/** どこにバックアップするかを抽象化するインターフェース */
export interface BackupTarget {
    backup(srcPath: string): Promise<void>;
}
