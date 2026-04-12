import session from 'express-session';
import PGSimple from 'connect-pg-simple';
import DatabaseConnection from '../db';
import ConfigService from '../services/config';
import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/app-error';

const pgSession = PGSimple(session);

const secret = ConfigService.getValue('SESSION_SECRET');

export const SessionMiddleware = () =>
    session({
        store: new pgSession({
            pool: DatabaseConnection.getPool(),
            createTableIfMissing: true,
        }),
        secret,
        resave: false,
        saveUninitialized: false,
    });

export const CheckUserMiddleware = (publicEndpoints: string[]) => {
    const pubSet = new Set(publicEndpoints);

    return (req: Request, res: Response, next: NextFunction) => {
        if (!pubSet.has(req.path) && !req.user)
            throw new AppError(401, 'Missing authenticated user');

        next();
    };
};
