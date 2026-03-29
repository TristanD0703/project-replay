import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user';
import errorMiddleware from './middleware/error';
import loggingMiddleware from './middleware/logging';
import VideoController from './controllers/video';

DatabaseConnection.connect();

const app = Express();
app.use(loggingMiddleware);
app.use(errorMiddleware);
app.use(Express.json());

UserController.registerRoutes(app);
VideoController.registerRoutes(app);

app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
