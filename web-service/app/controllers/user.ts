import { Request, Response } from 'express';
import AppError from '../app-error';
import { createUserSchema } from '../db/models/user';
import UserService from '../services/user';

export default class UserController {
    static async createUser(req: Request, res: Response) {
        const user = createUserSchema.parse(req.body);
        const dbRes = await UserService.createUser(user);

        res.status(201).json(dbRes);
    }

    static async getUserById(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        try {
            const dbRes = await UserService.getUserById(id);
            res.json(dbRes);
        } catch {
            throw new AppError(404, 'User not found');
        }
    }

    static async getUserByName(req: Request, res: Response) {
        const name = req.query.name;

        if (typeof name !== 'string') {
            throw new AppError(400, 'Query parameter Name is required');
        }

        const dbRes = await UserService.getUserByName(name);

        res.json(dbRes);
    }

    static async deleteUserById(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        try {
            await UserService.deleteUser(id);
        } catch {
            throw new AppError(404, 'User not found');
        }

        res.sendStatus(200);
    }

    static registerRoutes(app: any) {
        app.post('/user', this.createUser);
        app.get('/user/:id', this.getUserById);
        app.get('/user/', this.getUserByName);
        app.delete('/user/:id', this.deleteUserById);
    }
}
