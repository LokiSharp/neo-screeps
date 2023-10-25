import { RpcServer } from "@/Rpc/RpcServer";
import { RpcClient } from "@/Rpc/RpcClient";
import { Server, createServer, connect } from "net";
import _ from "lodash";
import { PubSub } from "@neo-screeps/storage";

const OLD_ENV = process.env;
let server: Server;
beforeAll(() => {
  process.env = { ...OLD_ENV }; // Make a copy
  process.env.STORAGE_PORT = "8080";
  process.env.STORAGE_HOST = "localhost";

  server = createServer((socket) => {
    const pubSub = new PubSub();
    const pubSubConnection = pubSub.create();
    new RpcServer(
      socket,
      _.extend({}, pubSubConnection.methods, {
        hello: (
          _: null,
          cb: (message: string | null, obj?: object) => void,
        ) => {
          try {
            console.log("Hello, this is RpcServer!");
            cb(null);
          } catch (e) {
            cb((e as Error).message);
            console.error(e);
          }
        },
      }),
    );
  });

  server.listen(
    parseInt(process.env.STORAGE_PORT!),
    process.env.STORAGE_HOST || "localhost",
  );
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
  server.close();
});

test("RpcServer", async () => {
  const logSpy = jest.spyOn(console, "log");
  const rpcClient = new RpcClient(
    connect(parseInt(process.env.STORAGE_PORT!), process.env.STORAGE_HOST),
  );
  await rpcClient.request("hello", () => {}).defer;
  expect(logSpy).toBeCalledWith("Hello, this is RpcServer!");
  rpcClient.subscribe("ps1", (data): void => {
    console.log(data);
  });
  await rpcClient.request("publish", "ps1", "This is ps1").defer;
  expect(logSpy).toBeCalledWith("This is ps1");
  rpcClient.socket.destroy();
});
