import passport from 'passport';
import AuthService from '../services/auth';
import { Request, Response } from 'express';

export default class AuthController {
    authService: AuthService;
    constructor(authService: AuthService) {
        this.authService = authService;
    }

    login(req: Request, res: Response) {
        passport.authenticate('oauth2');
    }

    async callback(req: Request, res: Response) {
        console.log('You did it!!');
        res.status(200).send('You did it!!');
    }

    registerRoutes(app: any) {
        app.get('/auth/login', passport.authenticate('oauth2'));
        app.get(
            '/auth/callback',
            passport.authenticate('oauth2', {
                failureRedirect: '/bad',
            }),
            this.callback,
        );
    }
}
