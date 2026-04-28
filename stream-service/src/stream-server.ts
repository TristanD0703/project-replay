import NodeMediaServer, { NodeMediaServerSession } from "node-media-server";
import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { exit } from "node:process";
import { Deque } from "@datastructures-js/deque";
import { isRealPNG } from "./utils";
const nmsLogger = require("node-media-server/src/core/logger.js");

export interface StreamServerOptions {
  listenAddr: string;
  port: number;
  tmpVideoStorageDirectory: string;
}

export interface FrameEvent {
  type: "error" | "end" | "success";
  frame?: Buffer;
  message?: string;
}

interface User { }

type ConnectionData = {
  ffmpegSessions: Set<ChildProcessWithoutNullStreams>;
  listenerSessions: Set<NodeMediaServerSession>;
  nmsSession: NodeMediaServerSession;
  user: User;
  streamPath: string;
  frames: Deque<Buffer>;
  pendingFrame?: Buffer;
};

type ConnectionRegistry = Map<string, ConnectionData>;

export class StreamServer {
  /**
   * streamKey -> connection data
   */
  private connectionRegistry: ConnectionRegistry;
  private PNG_TRAILER_MARKER = Buffer.from("0000000049454E44AE426082", "hex");
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
  }

  async *images(streamKey: string) {
    let conn = this.connectionRegistry.get(streamKey);
    if (!conn) {
      yield {
        type: "error",
        message: "Stream key is not associated with a connection",
      };
      return;
    }

    let badCount = 0;

    while (conn !== undefined && conn !== null) {
      const frameChunk = conn.frames.front();

      if (!frameChunk) {
        await new Promise((res) => setTimeout(res, 5));
        conn = this.connectionRegistry.get(streamKey);
        continue;
      }

      const popped = conn.frames.popFront();
      if (!popped) {
        conn = this.connectionRegistry.get(streamKey);
        continue;
      }

      if (!isRealPNG(popped)) {
        badCount++;
        if (badCount > 100)
          throw new Error("Ain't no way it take this long for a frame 💀");
        conn = this.connectionRegistry.get(streamKey);
        continue;
      }

      yield {
        type: "success",
        frame: popped,
      };

      conn = this.connectionRegistry.get(streamKey);
    }

    yield {
      type: "end",
    };
  }

  async waitUntilConnect(
    streamKey: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const pollMs = 25;
    const startedAt = Date.now();
    while (true) {
      const conn = this.connectionRegistry.get(streamKey);
      if (conn) return true;
      if (Date.now() - startedAt >= timeoutMs) {
        console.warn(
          `[StreamService] Timed out waiting for stream connection: ${streamKey}`,
        );
        return false;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollMs));
    }
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
      frames: new Deque<Buffer>(),
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

    this.connectionRegistry.delete(streamKey);
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
      const conn = this.connectionRegistry.get(streamKey);
      if (!conn) {
        console.warn(
          "[StreamService] Received frame data while connection is not initialized",
        );
        return;
      }

      this.handlePNGChunk(chunk, conn);
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
    process.on("SIGINT", () => {
      this.shutdown();
      exit(0);
    });
    process.on("SIGTERM", () => {
      this.shutdown();
      exit(0);
    });
  }

  private handlePNGChunk(chunk: Buffer, conn: ConnectionData) {
    let endIndex = chunk.indexOf(this.PNG_TRAILER_MARKER);
    let chunkFrameCount = 0;
    while (endIndex >= 0) {
      chunkFrameCount++;
      const currPNGChunk = chunk.subarray(
        0,
        endIndex + this.PNG_TRAILER_MARKER.length,
      );

      chunk = chunk.subarray(
        endIndex + this.PNG_TRAILER_MARKER.length,
        chunk.length,
      );

      endIndex = chunk.indexOf(this.PNG_TRAILER_MARKER);

      let back = conn.pendingFrame ?? Buffer.alloc(0);
      back = Buffer.concat([back, currPNGChunk]);
      conn.frames.pushBack(back);
      conn.pendingFrame = Buffer.alloc(0);
    }
    conn.pendingFrame = conn.pendingFrame
      ? Buffer.concat([conn.pendingFrame, chunk])
      : chunk;
  }
}
