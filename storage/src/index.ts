// eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
import { RpcServer } from "@neo-screeps/common";
import _ from "lodash";
import { PubSub } from "@/PubSub";
import * as net from "net";

export { DataBase } from "@/Database";
export { PubSub } from "@/PubSub";
export { Queue } from "@/Queue";

function socketListener(socket: net.Socket): void {
  const connectionDesc = `${socket.remoteAddress}:${socket.remotePort}`;

  console.log(`[${connectionDesc}] Incoming connection`);

  socket.on("error", (error) =>
    console.log(`[${connectionDesc}] Connection error: ${error.message}`),
  );
  const pubSub = new PubSub();
  const pubSubConnection = pubSub.create();
  new RpcServer(socket, _.extend({}, pubSubConnection.methods, {}));
  socket.on("close", () => {
    pubSubConnection.close();
    console.log(`[${connectionDesc}] Connection closed`);
  });
}

export function start(): void {
  const server = net.createServer(socketListener);

  server.on("listening", () => {
    console.log("Storage listening on", process.env.STORAGE_PORT || "5000");
    if (process.send) {
      process.send("storageLaunched");
    }
  });
  server.listen(
    parseInt(process.env.STORAGE_PORT || "5000"),
    process.env.STORAGE_HOST || "localhost",
  );
  process.on("disconnect", () => process.exit());
}
