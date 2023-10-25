import { Common, RpcServer } from "@/index";
import { createServer, Server } from "net";
import { DataBase, PubSub, Queue } from "@neo-screeps/storage";
import fs from "fs";
import _ from "lodash";

const OLD_ENV = process.env;
let server: Server;
let db: DataBase;
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

test("findPort", async () => {
  const common = new Common();
  const defer = common.findPort(8080);
  await defer.defer;
});

test("decodeTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  console.log(terrainString);
});

test("encodeTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  const result = common.decodeTerrain(terrainString, "testRoom");
  expect(result[0].type).toBe(terrain[0].type);
});

test("checkTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  const result = common.checkTerrain(terrainString, 0, 0, 1);
  expect(result).toBe(true);
});

test("getGameTime", () => {
  const common = new Common();
  common.storage.storageConnect();
  const result = common.getGameTime();
  expect(result).toBe(true);
});
