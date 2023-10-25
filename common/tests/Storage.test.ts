import { RpcServer } from "@/Rpc/RpcServer";
import { Storage } from "@/Storage/Storage";
import { Server, createServer } from "net";
import _ from "lodash";
import { DataBase, PubSub, Queue } from "@neo-screeps/storage";
import fs from "fs";

const OLD_ENV = process.env;
let server: Server;
let db: DataBase;
const storage = new Storage();
beforeAll(() => {
  process.env = { ...OLD_ENV }; // Make a copy
  process.env.STORAGE_PORT = "8080";
  process.env.STORAGE_HOST = "localhost";
  process.env.DB_PATH = "tmp/db.json";
});
beforeEach(() => {
  fs.mkdirSync("tmp/", { recursive: true });

  server = createServer((socket) => {
    const pubSub = new PubSub();
    const pubSubConnection = pubSub.create();
    db = new DataBase();
    db.loadDb();
    const queue = new Queue();
    new RpcServer(
      socket,
      _.extend({}, pubSubConnection.methods, db.toObject(), queue.toObject()),
    );
  });

  server.listen(
    parseInt(process.env.STORAGE_PORT!),
    process.env.STORAGE_HOST || "localhost",
  );
});

afterEach(async () => {
  db.db!.close();
  server.close();
  fs.rmSync("tmp/db.json", { recursive: true, force: true });
}, 5000);

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
  fs.rmSync("tmp/", { recursive: true, force: true });
});

test("Storage", async () => {
  await storage.storageConnect();
  await storage.db.rooms.insert({ name: "Loki", age: 1 }).defer;
  await storage.db.rooms
    .find({ age: { $gt: 0 } })
    .defer.then((result) => expect(result!.length).toBe(1));
  storage.socket!.destroy();
});
