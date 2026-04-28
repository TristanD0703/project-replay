import { StreamServer } from "./stream-server";
import { isRealPNG } from "./utils";
import fs from "fs/promises";

async function main(): Promise<void> {
  const poggies = new StreamServer({
    listenAddr: "0.0.0.0",
    port: 1935,
    tmpVideoStorageDirectory: "./videos",
  });

  poggies.start();

  console.log("Waiting for connect...");
  await poggies.waitUntilConnect("INSERTSTREAMKEYHERE", 10000);

  let frames = 0;
  for await (const frame of poggies.images("INSERTSTREAMKEYHERE")) {
    if (!frame.frame) continue;
    frames++;
    if (!isRealPNG(frame.frame))
      throw new Error("RECEIVER GOT A BAD FRAME ‼️😵‍💫");

    console.log("Received frame! Processing...");
    console.log("Saving file...");
    await fs.writeFile("./videos/frame-" + frames + ".png", frame.frame);
    const start = Date.now();

    const totalms = Date.now() - start;
    console.log("Processing completed in ", totalms, "ms!");
  }
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
