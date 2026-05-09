import { writeFileSync } from "node:fs";
import { FrameMatcher } from "./frame-text";
import { StreamServer } from "./stream-server";
import { isRealPNG } from "./utils";

async function main(): Promise<void> {
  const poggies = new StreamServer({
    listenAddr: "0.0.0.0",
    port: 1935,
    tmpVideoStorageDirectory: "./videos",
  });

  poggies.start();

  console.log("Waiting for connect...");
  await poggies.waitUntilConnect("INSERTSTREAMKEYHERE", 10000);

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

  let frames = 0;
  for await (const frame of poggies.images("INSERTSTREAMKEYHERE")) {
    if (!frame.frame) continue;
    frames++;
    if (!isRealPNG(frame.frame))
      throw new Error("RECEIVER GOT A BAD FRAME ‼️😵‍💫");

    console.log("Received frame! Processing...");
    // writeFileSync(`frames/frame-${frames}.png`, frame.frame);
    console.log(
      "Match found: ",
      await matcher.checkBufferForMatch(frame.frame),
    );
  }
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
