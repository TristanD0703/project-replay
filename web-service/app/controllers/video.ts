import { Request, Response } from 'express';
import AppError from '../app-error';
import {
    createRecordingMetadataSchema,
    updateRecordingStatusSchema,
} from '../db/models/recording';
import VideoService from '../services/video';
import AuthService from '../services/auth';

export default class VideoController {
    static async queueRecording(req: Request, res: Response) {
        // TODO: Unjankify with real auth
        const user = await AuthService.getUserFromRequest(req);
        delete req.body.user;

        const metadata = createRecordingMetadataSchema.parse(req.body);
        const dbRes = await VideoService.queueRecording(metadata, user.id);

        res.status(201).json(dbRes);
    }

    static async getVideosByUserId(req: Request, res: Response) {
        const userId = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const skipParam = Array.isArray(req.query.skip)
            ? req.query.skip[0]
            : req.query.skip;

        const countParam = Array.isArray(req.query.count)
            ? req.query.count[0]
            : req.query.count;

        let skip = 0;
        let count = 20;

        if (skipParam) {
            skip = Number.parseInt(String(skipParam));
        }

        if (countParam) {
            count = Number.parseInt(String(countParam));
        }

        if (skip < 0) {
            throw new AppError(
                400,
                'Query parameter skip must be a non-negative integer',
            );
        }

        if (count < 1) {
            throw new AppError(
                400,
                'Query parameter count must be a positive integer',
            );
        }

        const dbRes = await VideoService.getVideosByUserId(userId, skip, count);

        res.json(dbRes);
    }

    static async getVideoStatus(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const dbRes = await VideoService.getVideoStatus(id);
        res.json(dbRes);
    }

    static async getVideoId(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const dbRes = await VideoService.getVideoId(id);
        res.json(dbRes);
    }

    static async updateVideoMetadata(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;
        const metadata = updateRecordingStatusSchema.parse({
            ...req.body,
            id,
        });

        const user = await AuthService.getUserFromRequest(req);

        const dbRes = await VideoService.updateVideoMetadata(metadata, user.id);
        res.json(dbRes);
    }

    static async deleteVideoById(req: Request, res: Response) {
        const id = Array.isArray(req.params.id)
            ? req.params.id[0]
            : req.params.id;

        const user = await AuthService.getUserFromRequest(req);

        await VideoService.deleteVideoById(id, user.id);

        res.sendStatus(200);
    }

    static registerRoutes(app: any) {
        app.post('/video', this.queueRecording);
        app.get('/video/user/:id', this.getVideosByUserId);
        app.get('/video/:id/status', this.getVideoStatus);
        app.get('/video/:id', this.getVideoId);
        app.put('/video/:id', this.updateVideoMetadata);
        app.delete('/video/:id', this.deleteVideoById);
    }
}
