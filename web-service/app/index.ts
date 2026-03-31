import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user';
import errorMiddleware from './middleware/error';
import loggingMiddleware from './middleware/logging';
import VideoController from './controllers/video';

DatabaseConnection.connect();

const app = Express();

app.use(Express.json());
app.use(loggingMiddleware);

UserController.registerRoutes(app);
VideoController.registerRoutes(app);

app.use(errorMiddleware); // This order is intentional as errors occur last in the request pipeline

app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
