import { NextFunction, Request, Response } from 'express';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';

export default class AuthService {
    constructor() {
        const clientID = process.env.DISCORD_CLIENT_ID;
        if (!clientID) throw new Error('DISCORD_CLIENT_ID not in env');

        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        if (!clientSecret) throw new Error('DISCORD_CLIENT_SECRET not in env');

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
                    skipUserProfile: true,
                },
                (
                    accessToken: string,
                    refreshToken: string,
                    profile: any,
                    next: (err: any, profile: any) => any,
                ) => {
                    console.log({ accessToken, refreshToken });
                    return next(undefined, {});
                },
            ),
        );

        passport.serializeUser((user, done) => {
            console.log(user);
            done(undefined, {});
        });

        passport.deserializeUser((user, done) => {
            console.log(user);
            done(undefined, {});
        });

        console.log('Passport configured!');
    }

    // TODO: NEED TO IMPLEMENT ACTUAL AUTH HERE. DO NOT LEAVE IN PROD!
    static async getUserFromRequest(req: Request) {
        return req.body.user;
    }

    static async isUserValid(profile: any) {}
}
