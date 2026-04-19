import passport from 'passport';
import AuthService from '../services/auth';
import { Request, Response } from 'express';

export default class AuthController {
  authService: AuthService;
  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async callback(req: Request, res: Response) {
    console.log('You did it!!');
    res.status(200).send('You did it!!');
  }

  getMe(req: Request, res: Response) {
    res.json(AuthService.getUserFromRequest(req));
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

    app.get('/auth/me', this.getMe);
  }
}
