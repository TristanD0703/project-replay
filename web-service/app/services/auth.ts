import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import DatabaseConnection from '../db';
import Encryption from '../utils/encryption';
import axios from 'axios';
import UserService from './user';
import { User } from '../db/models/user';
import AppError from '../utils/app-error';
import ConfigService from './config';

interface DiscordUser {
    id: string;
    avatar: string;
    global_name: string;
    username: string;
}

interface DiscordUserResponse {
    user: DiscordUser;
}

export default class AuthService {
    static discordBaseApiUrl = 'https://discord.com/api/v10';

    constructor() {
        const clientID = ConfigService.getValue('DISCORD_CLIENT_ID');
        const clientSecret = ConfigService.getValue('DISCORD_CLIENT_SECRET');
        passport.initialize();
        passport.use(
            new OAuth2Strategy(
                {
                    authorizationURL:
                        'https://discord.com/oauth2/authorize?client_id=1489766727897317608&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fauth%2Fcallback&scope=identify+email',
                    callbackURL: 'http://localhost:8080/auth/callback',
                    tokenURL: 'https://discord.com/api/oauth2/token',
                    clientID,
                    clientSecret,
                },
                this.acceptUserLogin,
            ),
        );

        passport.serializeUser((user, done) => {
            done(undefined, user);
        });

        passport.deserializeUser((user, done) => {
            done(undefined, user as User);
        });
    }

    async acceptUserLogin(
        accessToken: string,
        refreshToken: string,
        params: { expires_in: number; scope: string },
        profile: any,
        next: (err: any, profile: any) => any,
    ) {
        const user = await AuthService.getRemoteUserInfo(accessToken);

        const localUser = await UserService.getOrCreateUser({
            discord_username: user.global_name,
            discord_avatar_hash: user.avatar,
            discord_id: user.id,
            is_streamer: false,
            is_admin: false,
        });

        await AuthService.saveTokens(
            accessToken,
            refreshToken,
            params.expires_in,
            localUser.id,
        );

        console.log(user, localUser);
        next(undefined, localUser);
    }

    // TODO: NEED TO IMPLEMENT ACTUAL AUTH HERE. DO NOT LEAVE IN PROD!
    static getUserFromRequest(req: Request): User {
        if (!req.user) throw new AppError(401, 'Missing authenticated user');

        return req.user as User;
    }

    static async isUserValid(profile: any) {}

    async getOrRefreshAccessTokenByUser(userId: string) {
        const conn = DatabaseConnection.getConnection();

        const token = await conn
            .selectFrom('tokens')
            .selectAll()
            .where('user_id', '=', userId)
            .executeTakeFirstOrThrow();

        const now = new Date();
        const enc = new Encryption();

        let [accessToken, refreshToken] = await Promise.all([
            enc.decrypt(token.access_token, token.salt),
            enc.decrypt(token.refresh_token, token.salt),
        ]);

        if (token.expires <= now) {
            accessToken = await this.getTokens(refreshToken, userId);
        }

        return accessToken;
    }

    async getTokens(refreshToken: string, userId: string) {
        const body = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        };

        const res = await axios.post<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
        }>(AuthService.discordBaseApiUrl + '/oauth2/token', body, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        await AuthService.saveTokens(
            res.data.access_token,
            res.data.refresh_token,
            res.data.expires_in,
            userId,
        );

        return res.data.access_token;
    }

    static async getRemoteUserInfo(accessToken: string): Promise<DiscordUser> {
        const headers = {
            Authorization: 'Bearer ' + accessToken,
        };

        const res = await axios.get<DiscordUserResponse>(
            this.discordBaseApiUrl + '/oauth2/@me',
            {
                headers,
            },
        );

        return res.data.user;
    }

    static async saveTokens(
        accessToken: string,
        refreshToken: string,
        expiresIn: number,
        userId: string,
    ) {
        const conn = DatabaseConnection.getConnection();

        conn.deleteFrom('tokens').where('user_id', '=', userId).execute();

        const encryption = new Encryption();
        const salt = encryption.generateSalt();

        const [encAccess, encRefresh] = await Promise.all([
            encryption.encrypt(accessToken, salt),
            encryption.encrypt(refreshToken, salt),
        ]);

        const expiresInMillis = expiresIn * 1000;
        const expireDate = new Date(Date.now() + expiresInMillis);

        const token = await conn
            .insertInto('tokens')
            .values({
                access_token: encAccess,
                refresh_token: encRefresh,
                salt,
                user_id: userId,
                expires: expireDate,
            })
            .executeTakeFirst();
        return token;
    }
}
