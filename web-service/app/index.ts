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

// The order these middleware are loaded in is VERY intentional.
// Be careful changing the order as some middleware are dependent on others
// occurring before them! :)

app.use(Express.json());
app.use(loggingMiddleware);
app.use(SessionMiddleware());
app.use(passport.authenticate('session'));
app.use(CheckUserMiddleware(['/auth/login', '/auth/callback']));

const authService = new AuthService();
const authController = new AuthController(authService);
authController.registerRoutes(app);

UserController.registerRoutes(app);
VideoController.registerRoutes(app);

app.use(errorMiddleware);

app.listen(8080, () => {
  console.log(`[INIT] Project Rewind listening on port 8080`);
});
