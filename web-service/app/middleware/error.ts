import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import AppError from '../utils/app-error';
import { NoResultError } from 'kysely';

type JsonSyntaxError = SyntaxError & {
  status?: number;
  type?: string;
};

const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Invalid request body',
      issues: err.issues,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  if (
    err instanceof SyntaxError &&
    (err as JsonSyntaxError).status === 400 &&
    'body' in err
  ) {
    res.status(400).json({
      message: 'Invalid JSON payload',
    });
    return;
  }

  if (
    (err instanceof Error && err.message === 'Not found') ||
    err instanceof NoResultError
  ) {
    res.status(404).json({
      message: 'Resource not found',
    });
    return;
  }

  console.error(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    err,
  );

  res.status(500).json({
    message: 'Internal server error',
  });
};

export default errorMiddleware;
