import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user';
import errorMiddleware from './middleware/error';
import loggingMiddleware from './middleware/logging';
import VideoController from './controllers/video';
import AuthController from './controllers/auth';
import AuthService from './services/auth';
import session from 'express-session';
import PGSimple from 'connect-pg-simple';
const pgSession = PGSimple(session);
import passport from 'passport';

process.loadEnvFile();

// TODO: Refactor into config class somehow
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error('SESSION_SECRET not provided in env');

DatabaseConnection.connect();
const app = Express();
app.use(Express.json());
app.use(
    // ugly ass pos
    session({
        store: new pgSession({
            pool: DatabaseConnection.getPool(),
            createTableIfMissing: true,
        }),
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }),
);
app.use(passport.authenticate('session'));
app.use(loggingMiddleware);


UserController.registerRoutes(app);
VideoController.registerRoutes(app);

const authService = new AuthService();
const authController = new AuthController(authService);

authController.registerRoutes(app);

app.use(errorMiddleware); // This order is intentional as errors occur last in the request pipeline

app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
