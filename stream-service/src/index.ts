import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import NodeMediaServer, {
  type NodeMediaServerConfig,
  type NodeMediaServerSession,
} from "node-media-server";
import { exit } from "node:process";

const bind = process.env.BIND_ADDR ?? "0.0.0.0";
const rtmpPort = Number(process.env.RTMP_PORT ?? "1935");
const httpPort = process.env.HTTP_PORT
  ? Number(process.env.HTTP_PORT)
  : undefined;
const videosDir = path.resolve(process.cwd(), "videos");
const ffmpegBySession = new Map<string, ChildProcessWithoutNullStreams>();
type ClosableNmsSession = NodeMediaServerSession & {
  close?: () => void;
  stop?: () => void;
};
const listenersByStream = new Map<string, Set<ClosableNmsSession>>();
const ffmpegReadTimeoutUs = "15000000";
const ffmpegTerminateDelayMs = 1500;
const ffmpegKillDelayMs = 5000;

function handlePngStdoutChunk(
  _sessionId: string,
  _streamKey: string,
  _chunk: Buffer,
): void {
  console.log("Received image! len: ", _chunk.length);
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function streamKeyFromSession(session: NodeMediaServerSession): string {
  if (session.streamName && session.streamName.length > 0) {
    return sanitizeFileSegment(session.streamName);
  }

  const pathSegment = session.streamPath.split("/").filter(Boolean).pop();
  if (pathSegment && pathSegment.length > 0) {
    return sanitizeFileSegment(pathSegment);
  }

  return `stream-${sanitizeFileSegment(session.id)}`;
}

function isFfmpegRunning(ffmpeg: ChildProcessWithoutNullStreams): boolean {
  return ffmpeg.exitCode === null && ffmpeg.signalCode === null;
}

function closeSession(session: ClosableNmsSession): void {
  if (typeof session.close === "function") {
    session.close();
    return;
  }

  if (typeof session.stop === "function") {
    session.stop();
  }
}

function closeStreamListeners(streamPath: string): void {
  const listeners = listenersByStream.get(streamPath);
  if (!listeners) {
    return;
  }

  for (const listener of [...listeners]) {
    closeSession(listener);
  }

  listenersByStream.delete(streamPath);
}

function stopFfmpeg(sessionId: string): void {
  const ffmpeg = ffmpegBySession.get(sessionId);
  if (!ffmpeg) {
    return;
  }

  ffmpegBySession.delete(sessionId);

  if (!isFfmpegRunning(ffmpeg)) {
    return;
  }

  console.log("Attempting shutdown for session id: ", sessionId);

  if (ffmpeg.stdin.writable && !ffmpeg.stdin.destroyed) {
    ffmpeg.stdin.end("q\n");
  }

  setTimeout(() => {
    if (!isFfmpegRunning(ffmpeg)) {
      return;
    }

    console.log(
      "Escalating ffmpeg shutdown with SIGTERM for session id: ",
      sessionId,
    );
    ffmpeg.kill("SIGTERM");
  }, ffmpegTerminateDelayMs).unref();

  setTimeout(() => {
    if (!isFfmpegRunning(ffmpeg)) {
      return;
    }

    console.log(
      "Forcibly killing ffmpeg with SIGKILL for session id: ",
      sessionId,
    );
    ffmpeg.kill("SIGKILL");
  }, ffmpegKillDelayMs).unref();
}

function createServerConfig(): NodeMediaServerConfig {
  const config: NodeMediaServerConfig = {
    bind,
    rtmp: { port: rtmpPort },
    auth: {
      play: false,
      publish: false,
    },
    record: {
      path: "./videos",
    },
  };

  if (httpPort) {
    config.http = { port: httpPort };
  }

  return config;
}

function registerEventHandlers(nms: NodeMediaServer): void {
  nms.on("postPlay", (session) => {
    const listeners =
      listenersByStream.get(session.streamPath) ?? new Set<ClosableNmsSession>();
    listeners.add(session as ClosableNmsSession);
    listenersByStream.set(session.streamPath, listeners);
  });

  nms.on("donePlay", (session) => {
    const listeners = listenersByStream.get(session.streamPath);
    if (!listeners) {
      return;
    }

    listeners.delete(session as ClosableNmsSession);
    if (listeners.size === 0) {
      listenersByStream.delete(session.streamPath);
    }
  });

  nms.on("postPublish", (session) => {
    const streamPath = session.streamPath;
    if (!streamPath) {
      console.warn("postPublish missing streamPath", session.id);
      return;
    }

    const streamKey = streamKeyFromSession(session);
    const outputPath = path.join(videosDir, `${streamKey}-${Date.now()}.mp4`);
    const inputUrl = `rtmp://127.0.0.1:${rtmpPort}${streamPath}`;

    stopFfmpeg(session.id);

    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-stats_period",
      "1",
      "-rw_timeout",
      ffmpegReadTimeoutUs,
      "-i",
      inputUrl,
      "-map",
      "0:v",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "18",
      "-r",
      "60",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      outputPath,
      "-map",
      "0:v",
      "-vf",
      "fps=1,scale=960:-1,format=gray",
      "-f",
      "image2pipe",
      "-c:v",
      "png",
      "pipe:1",
    ]);

    ffmpegBySession.set(session.id, ffmpeg);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[ffmpeg ${streamKey}] ${data.toString().trimEnd()}`);
    });

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      handlePngStdoutChunk(session.id, streamKey, chunk);
    });

    ffmpeg.on("close", (code, signal) => {
      console.log(
        `ffmpeg exited for ${streamKey}: code=${code} signal=${signal}`,
      );
      ffmpegBySession.delete(session.id);
    });

    ffmpeg.on("error", (error) => {
      ffmpegBySession.delete(session.id);
      console.error(`failed to start ffmpeg for ${streamKey}:`, error.message);
    });

    console.log(`recording started for ${streamKey}: ${outputPath}`);
  });

  nms.on("donePublish", (session) => {
    stopFfmpeg(session.id);
    closeStreamListeners(session.streamPath);
    console.log(`recording stopped for ${streamKeyFromSession(session)}`);
  });
}

function registerShutdownHandlers(): void {
  const shutdown = () => {
    for (const sessionId of ffmpegBySession.keys()) {
      stopFfmpeg(sessionId);
    }

    for (const streamPath of listenersByStream.keys()) {
      closeStreamListeners(streamPath);
    }

    exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function main(): Promise<void> {
  await mkdir(videosDir, { recursive: true });

  const nms = new NodeMediaServer(createServerConfig());
  registerEventHandlers(nms);
  registerShutdownHandlers();
  nms.run();

  console.log(`Node Media Server listening on rtmp://${bind}:${rtmpPort}`);
  if (httpPort) {
    console.log(`HTTP-FLV listening on http://${bind}:${httpPort}`);
  }
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
