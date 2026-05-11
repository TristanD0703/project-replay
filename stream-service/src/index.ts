import { FrameMatcher } from "./stream/frame-text";
import { StreamServer } from "./stream/stream-server";
import Stream from "./stream";

async function main(): Promise<void> {
  const poggies = new StreamServer({
    listenAddr: "0.0.0.0",
    port: 1935,
    tmpVideoStorageDirectory: "./videos",
  });

  poggies.start();

  const matcher = new FrameMatcher({
    REPLAY_NOT_FOUND: {
      path: "./src/game-state-images/replay-not-found.png",
      croppedX: 320,
      croppedY: 235,
      croppedWidth: 318,
      croppedHeight: 65,
      matchThreshold: 0.85,
    },
    REPLAY_IN_PROGRESS: {
      path: "./src/game-state-images/replay-in-progress.png",
      croppedX: 30,
      croppedY: 20,
      croppedWidth: 130,
      croppedHeight: 125,
      matchThreshold: 0.85,
    },
    REPLAY_CONCLUDED: {
      path: "./src/game-state-images/replay-concluded.png",
      croppedX: 425,
      croppedY: 165,
      croppedWidth: 112,
      croppedHeight: 50,
      matchThreshold: 0.85,
    },
  });

  const stream = new Stream(poggies, matcher, "INSERTSTREAMKEYHERE");
  await stream.record();
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
