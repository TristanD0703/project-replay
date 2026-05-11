import { FrameMatcher } from "./frame-text";
import { StreamServer } from "./stream-server";

const DEFAULT_STREAM_CONNECT_TIMEOUT = 10000;

export default class Stream {
  private streamState: string = "STOPPED";
  private handlers: Map<string, () => Promise<void>> = new Map();
  private saveFile?: string = undefined;

  constructor(
    private readonly streamServer: StreamServer,
    private readonly frameMatcher: FrameMatcher,
    private streamKey: string,
  ) { }

  getStreamState(): string {
    return this.streamState;
  }

  on(event: string, cb: () => Promise<void>) {
    this.handlers.set(event, cb);
  }

  async record(
    connectTimeout: number = DEFAULT_STREAM_CONNECT_TIMEOUT,
  ): Promise<string> {
    console.log(`[Stream] initializing stream for key ${this.streamKey}`);

    if (!this.streamServer.isRunning())
      throw new Error("Tried recording a stream while server is shut down");

    this.saveFile = await this.streamServer.waitUntilConnect(
      this.streamKey,
      connectTimeout,
    );

    if (!this.saveFile)
      throw new Error(
        `Stream key ${this.streamKey} expected to connect but did not connect in time`,
      );

    console.log(`[Stream] starting recording... ${this.streamKey}`);

    for await (const frame of this.streamServer.images(this.streamKey)) {
      if (frame.type === "end") break;

      if (frame.type === "error") {
        throw new Error(
          `Streamer had an error capturing frames. ${frame.message}`,
        );
      } else if (frame.frame) {
        this.streamState = await this.frameMatcher.checkBufferForMatch(
          frame.frame,
        );

        await this.dispatchEvent();
      }
    }
    return this.saveFile;
  }

  async stop() {
    await this.streamServer.disconnectClient(this.streamKey);
  }

  private async dispatchEvent() {
    console.log("[Stream] Recognized event ", this.streamState);
    const handler = this.handlers.get(this.streamState);

    if (!handler && this.streamState === "REPLAY_CONCLUDED") {
      console.log(
        "[Stream] Stopping stream key due to receiving event ",
        this.streamState,
        this.streamKey,
      );
      await this.stop();
      console.log(
        `[Stream] Stream stopped successfully. Saved replay at ${this.saveFile}. streamKey: ${this.streamKey}`,
      );
    }

    if (!handler) return;

    await handler();
  }
}
