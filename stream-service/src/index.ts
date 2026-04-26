import { StreamServer } from "./stream-server";
import { isRealPNG } from "./utils";

async function main(): Promise<void> {
  const poggies = new StreamServer({
    listenAddr: "0.0.0.0",
    port: 1935,
    tmpVideoStorageDirectory: "./videos",
  });

  poggies.start();

  for await (const frame of poggies.images("INSERTSTREAMKEYHERE")) {
    console.log("FRAME DATA", frame);
    if (!frame.frame) continue;

    console.log("IS FRAME?!?!", isRealPNG(frame.frame));
  }
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
