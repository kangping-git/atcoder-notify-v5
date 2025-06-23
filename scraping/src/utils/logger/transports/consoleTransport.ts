import chalk from 'chalk';
import { Transport, LogLevel, levelNames } from '../types.js';

export class ConsoleTransport implements Transport {
    constructor(public minLevel: LogLevel = LogLevel.TRACE) {}

    log(level: LogLevel, time: Date, msg: string) {
        if (level < this.minLevel) return;
        const stamped = `${time.toISOString()} ${levelNames[level]} ${msg}`;
        console.log(this.colorize(level, stamped));
    }

    private colorize(level: LogLevel, s: string) {
        switch (level) {
            case LogLevel.TRACE:
            case LogLevel.DEBUG:
                return chalk.gray(s);
            case LogLevel.INFO:
                return chalk.white(s);
            case LogLevel.WARN:
                return chalk.yellow(s);
            case LogLevel.ERROR:
                return chalk.red(s);
            case LogLevel.FATAL:
                return chalk.bgRed.whiteBright.bold(s);
            default:
                return s;
        }
    }
}
