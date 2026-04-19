import { NextFunction, Request, Response } from 'express';

export default function loggingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

        console.log(
            `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`,
        );
    });

    next();
}
