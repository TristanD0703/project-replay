import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user';
import errorMiddleware from './middleware/error';
import loggingMiddleware from './middleware/logging';
import VideoController from './controllers/video';
import AuthController from './controllers/auth';
import AuthService from './services/auth';
import passport from 'passport';
import { CheckUserMiddleware, SessionMiddleware } from './middleware/auth';

DatabaseConnection.connect();
const app = Express();
app.use(Express.json());
app.use(SessionMiddleware());
app.use(CheckUserMiddleware(['/auth/login', '/auth/callback']));
app.use(loggingMiddleware);
app.use(passport.authenticate('session'));

const authService = new AuthService();
const authController = new AuthController(authService);
authController.registerRoutes(app);

UserController.registerRoutes(app);
VideoController.registerRoutes(app);

app.use(errorMiddleware); // This order is intentional as errors occur last in the request pipeline

app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
