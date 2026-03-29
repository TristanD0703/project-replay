import { Request } from 'express';

export default class AuthService {
    // TODO: NEED TO IMPLEMENT ACTUAL AUTH HERE. DO NOT LEAVE IN PROD!
    static async getUserFromRequest(req: Request) {
        return req.body.user;
    }
}
