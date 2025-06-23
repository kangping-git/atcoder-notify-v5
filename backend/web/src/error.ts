import { Request, Response } from 'express';
import { STATUS_CODES } from 'http';

export function responseError(statusCode: number, res: Response, req: Request): void {
    if (statusCode >= 500) {
        res.status(statusCode).json({
            status: 'error',
            statusCode: statusCode,
            message: STATUS_CODES[statusCode] || 'Internal Server Error',
        });
        return;
    }
    res.status(statusCode).render('error', {
        statusCode: statusCode,
        message: STATUS_CODES[statusCode] || 'Internal Server Error',
        url: req.url,
    });
}
