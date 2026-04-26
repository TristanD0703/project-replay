import NodeMediaServer, { NodeMediaServerSession } from "node-media-server";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { exit } from "node:process";
const nmsLogger = require("node-media-server/src/core/logger.js");

export interface StreamServerOptions {
  listenAddr: string;
  port: number;
  tmpVideoStorageDirectory: string;
}

interface User { }

type ConnectionData = {
  ffmpegSessions: Set<ChildProcessWithoutNullStreams>;
  listenerSessions: Set<NodeMediaServerSession>;
  nmsSession: NodeMediaServerSession;
  user: User;
  streamPath: string;
};

type ConnectionRegistry = Map<string, ConnectionData>;

export class StreamServer {
  /**
   * streamKey -> connection data
   */
  private connectionRegistry: ConnectionRegistry;

  private opts: StreamServerOptions;

  constructor(opts: StreamServerOptions) {
    this.opts = opts;
    this.connectionRegistry = new Map<string, ConnectionData>();
  }

  start() {
    const nmsConfig = {
      bind: this.opts.listenAddr,
      rtmp: { port: this.opts.port },
      auth: {
        play: false,
        publish: false,
      },
    };

    this.SILENCEEEE();
    const nms = new NodeMediaServer(nmsConfig);

    nms.on("postPublish", (session) => this.streamerConnects(session));
    nms.on("donePublish", (session) => this.streamerDisconnects(session));
    nms.on("postPlay", (session) => this.listenerConnects(session));
    nms.on("donePlay", (session) => this.listenerDisconnects(session));
    this.registerShutdownHandlers();

    nms.run();
    console.log("[StreamServer] Streaming service started listening");
  }

  shutdown() {
    console.log("[StreamService] Gracefully shutting down...");

    this.connectionRegistry.forEach((conn, streamKey) => {
      for (const listener of conn.listenerSessions) {
        if (listener.close) listener.close();
        if (listener.stop) listener.stop();

        for (const ffmpeg of conn.ffmpegSessions)
          this.shutdownFfmpeg(ffmpeg, streamKey);
      }
    });

    console.log("[StreamService] Shutdown success!");
    exit(0);
  }

  async *images(streamSessionId: string) {
    //TODO: Receive image packages from ffmpeg, bundle and return image byte array
  }

  private SILENCEEEE() {
    nmsLogger.trace = () => { };
    nmsLogger.debug = () => { };
    nmsLogger.info = () => { };
    nmsLogger.warn = () => { };
  }

  private listenerConnects(session: NodeMediaServerSession) {
    console.log(
      "[StreamServer] Listener connected for filePath: ",
      session.streamPath,
    );

    const sessionKey = this.streamKeyFromSession(session);
    const conn = this.connectionRegistry.get(sessionKey);
    conn?.listenerSessions.add(session);
  }

  private listenerDisconnects(session: NodeMediaServerSession) {
    console.log(
      "[StreamServer] Listener disconnected for filePath: ",
      session.streamPath,
    );

    const sessionKey = this.streamKeyFromSession(session);
    const conn = this.connectionRegistry.get(sessionKey);
    conn?.listenerSessions.delete(session);
  }

  private async authenticateStreamer(streamKey: string): Promise<boolean> {
    // TODO: Handle stream key authentication within this streamPath
    return true;
  }

  private streamKeyFromSession(session: NodeMediaServerSession) {
    const paths = session.streamPath
      .split("/")
      .filter((part) => part.length > 0);

    return paths[paths.length - 1];
  }

  private streamerConnects(session: NodeMediaServerSession) {
    const streamKey = this.streamKeyFromSession(session);
    if (!this.authenticateStreamer(streamKey)) {
      if (session.close) session.close();
      if (session.stop) session.stop();
      return;
    }

    const ffmpegSessions = new Set<ChildProcessWithoutNullStreams>();
    const { streamPath } = this.setupFfmpeg(session, ffmpegSessions, streamKey);

    const connection: ConnectionData = {
      ffmpegSessions,
      nmsSession: session,
      user: {},
      streamPath,
      listenerSessions: new Set(),
    };

    this.connectionRegistry.set(streamKey, connection);

    console.log(
      `[StreamService] Streaming connected for ${streamKey}: ${streamPath}`,
    );
  }

  private async streamerDisconnects(session: NodeMediaServerSession) {
    const streamKey = this.streamKeyFromSession(session);
    const conn = this.connectionRegistry.get(streamKey);

    if (!conn)
      throw new Error("Failed to retrieve connection streamId: " + session.id);

    for (const listener of conn.listenerSessions) {
      if (listener.close) listener.close();
      if (listener.stop) listener.stop();
    }

    for (const ffmpeg of conn.ffmpegSessions) {
      if (!(await this.shutdownFfmpeg(ffmpeg, session.id))) {
        console.warn(
          "[StreamService] FFMPEG failed to shutdown properly and video may be corrupted! sessionId: ",
          session.id,
        );
      }
    }

    console.log(
      "[StreamService] Streming finished for sessionId: ",
      session.id,
    );
  }

  private isFfmpegRunning(ffmpeg: ChildProcessWithoutNullStreams): boolean {
    return ffmpeg.exitCode === null && ffmpeg.signalCode === null;
  }

  private shutdownFfmpeg(
    ffmpeg: ChildProcessWithoutNullStreams,
    streamKey: string,
  ): Promise<boolean> {
    if (ffmpeg.stdin.writable && !ffmpeg.stdin.destroyed) {
      ffmpeg.stdin.end("q\n");
    }
    const conn = this.connectionRegistry.get(streamKey);

    const finished = new Promise<boolean>((res, _) => {
      setTimeout(() => {
        if (!this.isFfmpegRunning(ffmpeg)) {
          res(true);
          return;
        }

        console.warn(
          "[StreamService] Expediting shutdown FFMPEG instance for streamId: ",
          conn?.nmsSession.id,
        );

        ffmpeg.kill("SIGTERM");

        setTimeout(() => {
          if (this.isFfmpegRunning(ffmpeg)) {
            console.warn(
              "[StreamService] Forcibly shutting down FFMPEG instance for streamId: ",
              conn?.nmsSession.id,
            );
            ffmpeg.kill("SIGKILL");
          }

          res(false);
        }, 1500);
      }, 500);
    });

    return finished;
  }

  private setupFfmpeg(
    session: NodeMediaServerSession,
    ffmpegSessionSet: Set<ChildProcessWithoutNullStreams>,
    streamKey: string,
  ) {
    const streamPath = this.formatOutputPath();
    const ffmpeg = spawn("ffmpeg", this.craftFfmpegArgs(streamPath, streamKey));

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[ffmpeg ${session.id}] ${data.toString().trimEnd()}`);
    });

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      console.log("TODO: handle png data! chunkLen: " + chunk.length);
    });

    ffmpeg.on("close", (code, signal) => {
      console.log(
        `ffmpeg exited for ${session.id}: code=${code} signal=${signal}`,
      );
      ffmpegSessionSet.delete(ffmpeg);
    });

    ffmpeg.on("error", (error) => {
      ffmpegSessionSet.delete(ffmpeg);
      console.error(
        `[StreamService] Failed to start ffmpeg for ${session.id}:`,
        error.message,
      );
    });

    return { ffmpeg, streamPath };
  }

  private formatOutputPath() {
    const uuid = randomUUID();

    return this.opts.tmpVideoStorageDirectory + "/" + uuid + ".mp4";
  }

  private craftFfmpegArgs(streamPath: string, streamKey: string) {
    const inputUrl = `rtmp://localhost:${this.opts.port}/${streamKey}`;
    console.log(
      "[StreamService] Storing new stream at streamPath: ",
      streamPath,
    );

    return [
      "-hide_banner",
      "-loglevel",
      "warning",
      "-stats_period",
      "1",
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
      streamPath,
      "-map",
      "0:v",
      "-vf",
      "fps=1,scale=960:-1,format=gray",
      "-f",
      "image2pipe",
      "-c:v",
      "png",
      "pipe:1",
    ];
  }

  private registerShutdownHandlers(): void {
    process.on("SIGINT", () => this.shutdown());
    process.on("SIGTERM", () => this.shutdown());
  }
}
