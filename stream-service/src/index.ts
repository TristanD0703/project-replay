import { StreamServer } from "./stream-server";

async function main(): Promise<void> {
  const poggies = new StreamServer({
    listenAddr: "0.0.0.0",
    port: 1935,
    tmpVideoStorageDirectory: "./videos",
  });

  poggies.start();
}

main().catch((error: unknown) => {
  console.error("stream-service failed to start", error);
  process.exitCode = 1;
});
