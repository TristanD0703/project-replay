import Express from 'express';
import DatabaseConnection from './db';
import UserController from './controllers/user/user';

DatabaseConnection.connect();

const app = Express();
app.use(Express.json());

UserController.registerRoutes(app);
app.listen(8080, () => {
    console.log(`Example app listening on port 8080`);
});
