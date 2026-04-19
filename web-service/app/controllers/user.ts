import { Request, Response } from 'express';
import AppError from '../utils/app-error';
import { createUserSchema } from '../db/models/user';
import UserService from '../services/user';
import { asyncHandler } from '../utils/async-handler';
import AuthService from '../services/auth';

export default class UserController {
  static async createUser(req: Request, res: Response) {
    const user = createUserSchema.parse(req.body);

    const userFromReq = AuthService.getUserFromRequest(req);

    if (!userFromReq.is_admin) throw new AppError(403, "Cannot create user programmatically if not admin")

    const dbRes = await UserService.getOrCreateUser(user);

    res.status(201).json(dbRes);
  }

  static async getUserById(req: Request, res: Response) {
    const id = Array.isArray(req.params.userId)
      ? req.params.userId[0]
      : req.params.userId;

    const dbRes = await UserService.getUserById(id);
    res.json(dbRes);
  }

  static async getUserByName(req: Request, res: Response) {
    const name = req.query.name;

    if (typeof name !== 'string') {
      throw new AppError(400, 'Query parameter Name is required');
    }

    try {
      const dbRes = await UserService.getUserByName(name);
      res.json(dbRes);
    } catch (e: any) {
      throw new AppError(404, 'User not found.');
    }
  }

  static async getUserByDiscordId(req: Request, res: Response) {
    const discordId = req.query.discordId;

    if (typeof discordId !== 'string') {
      throw new AppError(400, 'Query parameter discordId is required');
    }

    try {
      const dbRes =
        await UserService.getUserByDiscordIdAndThrow(discordId);
      res.json(dbRes);
    } catch (e: any) {
      throw new AppError(404, 'User not found.');
    }
  }

  static async getUserByQuery(req: Request, res: Response) {
    const params = Object.keys(req.query);
    if (params.length !== 1) {
      throw new AppError(400, 'Only specify 1 query parameter');
    }
    switch (params[0]) {
      case 'userId':
        return await UserController.getUserById(req, res);
      case 'discordId':
        return await UserController.getUserByDiscordId(req, res);
      case 'name':
        return await UserController.getUserByName(req, res);
      default:
        throw new AppError(400, 'Query parameter name not valid');
    }
  }

  static async deleteUserById(req: Request, res: Response) {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    await UserService.deleteUser(id);

    res.sendStatus(200);
  }

  static registerRoutes(app: any) {
    app.post('/user', asyncHandler(this.createUser));
    app.get('/user/:id', asyncHandler(this.getUserById));
    app.get('/user/', asyncHandler(this.getUserByQuery));
    app.delete('/user/:id', asyncHandler(this.deleteUserById));
  }
}
