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

  let count = 0;
  for await (const frame of poggies.images("INSERTSTREAMKEYHERE")) {
    if (!frame.frame) continue;

    if (!isRealPNG(frame.frame))
      throw new Error("RECEIVER GOT A BAD FRAME ‼️😵‍💫");

    count++;
    console.log("saving file...");
    await fs.writeFile("./videos/frame-" + count + ".png", frame.frame);
  }
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
