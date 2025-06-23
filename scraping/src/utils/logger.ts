/* Core Logger + shared types */

import util from 'node:util';
import { Transport, LogLevel, levelNames } from './logger/types';

export class Logger {
    constructor(private transports: Transport[] = [], private context: string[] = []) {}

    /* -------- public log methods -------- */
    trace(...args: unknown[]) {
        this._log(LogLevel.TRACE, args);
    }
    debug(...args: unknown[]) {
        this._log(LogLevel.DEBUG, args);
    }
    info(...args: unknown[]) {
        this._log(LogLevel.INFO, args);
    }
    warn(...args: unknown[]) {
        this._log(LogLevel.WARN, args);
    }
    error(...args: unknown[]) {
        this._log(LogLevel.ERROR, args);
    }
    fatal(...args: unknown[]) {
        this._log(LogLevel.FATAL, args);
    }

    /* --- create child logger with additional context --- */
    child(...ctx: string[]) {
        return new Logger(this.transports, [...this.context, ...ctx]);
    }

    addTransport(t: Transport) {
        this.transports.push(t);
    }

    /* -------- internals -------- */
    private _log(level: LogLevel, args: unknown[]) {
        const time = new Date();
        const ctx = this.context.length ? `[${this.context.join(':')}] ` : '';
        const msg = ctx + util.format(...args);
        for (const t of this.transports) t.log(level, time, msg);
    }
}
