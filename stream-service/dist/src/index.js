"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_media_server_1 = __importDefault(require("node-media-server"));
const bind = (_a = process.env.BIND_ADDR) !== null && _a !== void 0 ? _a : "0.0.0.0";
const rtmpPort = Number((_b = process.env.RTMP_PORT) !== null && _b !== void 0 ? _b : "1935");
const httpPort = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : undefined;
const videosDir = node_path_1.default.resolve(process.cwd(), "videos");
const ffmpegBySession = new Map();
function sanitizeFileSegment(value) {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function streamKeyFromSession(session) {
    if (session.streamName && session.streamName.length > 0) {
        return sanitizeFileSegment(session.streamName);
    }
    const pathSegment = session.streamPath.split("/").filter(Boolean).pop();
    if (pathSegment && pathSegment.length > 0) {
        return sanitizeFileSegment(pathSegment);
    }
    return `stream-${sanitizeFileSegment(session.id)}`;
}
function stopFfmpeg(sessionId) {
    const ffmpeg = ffmpegBySession.get(sessionId);
    if (!ffmpeg) {
        return;
    }
    ffmpegBySession.delete(sessionId);
    if (ffmpeg.exitCode !== null || ffmpeg.killed) {
        return;
    }
    ffmpeg.kill("SIGTERM");
    setTimeout(() => {
        if (ffmpeg.exitCode === null && !ffmpeg.killed) {
            ffmpeg.kill("SIGKILL");
        }
    }, 5000).unref();
}
function createServerConfig() {
    const config = {
        bind,
        rtmp: { port: rtmpPort },
        auth: {
            play: false,
            publish: false,
        },
    };
    if (httpPort) {
        config.http = { port: httpPort };
    }
    return config;
}
function registerEventHandlers(nms) {
    nms.on("postPublish", (session) => {
        const streamPath = session.streamPath;
        if (!streamPath) {
            console.warn("postPublish missing streamPath", session.id);
            return;
        }
        const streamKey = streamKeyFromSession(session);
        const outputPath = node_path_1.default.join(videosDir, `${streamKey}-${Date.now()}.mp4`);
        const inputUrl = `rtmp://127.0.0.1:${rtmpPort}${streamPath}`;
        stopFfmpeg(session.id);
        const ffmpeg = (0, node_child_process_1.spawn)("ffmpeg", [
            "-hide_banner",
            "-loglevel",
            "warning",
            "-nostats",
            "-i",
            inputUrl,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "18",
            "-c:a",
            "aac",
            outputPath,
        ]);
        ffmpegBySession.set(session.id, ffmpeg);
        ffmpeg.stderr.on("data", (data) => {
            console.log(`[ffmpeg ${streamKey}] ${data.toString().trimEnd()}`);
        });
        ffmpeg.on("close", (code, signal) => {
            ffmpegBySession.delete(session.id);
            console.log(`ffmpeg exited for ${streamKey}: code=${code} signal=${signal}`);
        });
        ffmpeg.on("error", (error) => {
            ffmpegBySession.delete(session.id);
            console.error(`failed to start ffmpeg for ${streamKey}:`, error.message);
        });
        console.log(`recording started for ${streamKey}: ${outputPath}`);
    });
    nms.on("donePublish", (session) => {
        stopFfmpeg(session.id);
        console.log(`recording stopped for ${streamKeyFromSession(session)}`);
    });
}
function registerShutdownHandlers() {
    const shutdown = () => {
        for (const sessionId of ffmpegBySession.keys()) {
            stopFfmpeg(sessionId);
        }
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, promises_1.mkdir)(videosDir, { recursive: true });
        const nms = new node_media_server_1.default(createServerConfig());
        registerEventHandlers(nms);
        registerShutdownHandlers();
        nms.run();
        console.log(`Node Media Server listening on rtmp://${bind}:${rtmpPort}`);
        if (httpPort) {
            console.log(`HTTP-FLV listening on http://${bind}:${httpPort}`);
        }
    });
}
main().catch((error) => {
    console.error("stream-service failed to start", error);
    process.exitCode = 1;
});
