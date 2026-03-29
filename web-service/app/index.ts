import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user/user';
import errorMiddleware from './middleware/error';
import loggingMiddleware from './middleware/logging';

DatabaseConnection.connect();

const app = Express();
app.use(loggingMiddleware);
app.use(errorMiddleware);
app.use(Express.json());

UserController.registerRoutes(app);
app.use(errorMiddleware);
app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
