import net from "net";
import { RpcClient } from "@/Rpc/RpcClient";
import { config } from "@/ConfigManager";
import { DataBaseStorage, Defer } from "@/types";
import { makeDefer } from "@/utils";

export let connected = false;
export let resetAllData: () => Defer;
export const db: DataBaseStorage = {} as DataBaseStorage;
export const queue = {};
export const env = {};
export let socket: net.Socket;
export const pubSub = {
  keys: {
    QUEUE_DONE: "queueDone:",
    RUNTIME_RESTART: "runtimeRestart",
    TICK_STARTED: "tickStarted",
    ROOMS_DONE: "roomsDone",
  },
};
export function storageConnect(): Promise<unknown> {
  if (connected) {
    return new Promise<void>(() => {});
  }

  if (!process.env.STORAGE_PORT) {
    throw new Error("STORAGE_PORT environment variable is not set!");
  }

  console.log("Connecting to storage");

  socket = net.connect(
    parseInt(process.env.STORAGE_PORT!),
    process.env.STORAGE_HOST,
  );
  const rpcClient = new RpcClient(socket);

  const defer = makeDefer();
  const resetDefer = makeDefer();

  function resetInterceptor(
    fn: (...args: unknown[]) => Defer,
  ): (...args: unknown[]) => Defer {
    return fn;
  }

  function wrapCollection(collectionName: string): {
    [name: string]: (...args: unknown[]) => Defer;
  } {
    const wrap: { [name: string]: (...args: unknown[]) => Defer } = {};
    [
      "find",
      "findOne",
      "by",
      "clear",
      "count",
      "ensureIndex",
      "removeWhere",
      "insert",
    ].forEach((method) => {
      wrap[method] = function (): Defer {
        return rpcClient.request(
          "dbRequest",
          collectionName,
          method,
          // eslint-disable-next-line prefer-rest-params
          Array.prototype.slice.call(arguments),
        );
      };
    });
    wrap.update = resetInterceptor(function (query, update, params) {
      return rpcClient.request(
        "dbUpdate",
        collectionName,
        query,
        update,
        params,
      );
    });
    wrap.bulk = resetInterceptor(function (bulk) {
      return rpcClient.request("dbBulk", collectionName, bulk);
    });
    wrap.findEx = resetInterceptor(function (query, opts) {
      return rpcClient.request("dbFindEx", collectionName, query, opts);
    });
    return wrap;
  }

  config.common.dbCollections.forEach(
    (i) => (exports.db[i] = wrapCollection(i)),
  );

  resetAllData = (): Defer => rpcClient.request("dbResetAllData");

  Object.assign(queue, {
    fetch: resetInterceptor(rpcClient.request.bind(rpcClient, "queueFetch")),
    add: resetInterceptor(rpcClient.request.bind(rpcClient, "queueAdd")),
    addMulti: resetInterceptor(
      rpcClient.request.bind(rpcClient, "queueAddMulti"),
    ),
    markDone: resetInterceptor(
      rpcClient.request.bind(rpcClient, "queueMarkDone"),
    ),
    whenAllDone: resetInterceptor(
      rpcClient.request.bind(rpcClient, "queueWhenAllDone"),
    ),
    reset: resetInterceptor(rpcClient.request.bind(rpcClient, "queueReset")),
  });

  Object.assign(env, {
    get: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvGet")),
    mget: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvMget")),
    set: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvSet")),
    setex: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvSetex")),
    expire: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvExpire")),
    ttl: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvTtl")),
    del: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvDel")),
    hmget: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvHmget")),
    hmset: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvHmset")),
    hget: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvHget")),
    hset: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvHset")),
    sadd: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvSadd")),
    smembers: resetInterceptor(
      rpcClient.request.bind(rpcClient, "dbEnvSmembers"),
    ),
  });

  Object.assign(pubSub, {
    publish: resetInterceptor(rpcClient.request.bind(rpcClient, "publish")),
    subscribe(channel: string, cb: (...args: unknown[]) => void) {
      rpcClient.subscribe(channel, cb);
    },
  });

  connected = true;

  defer.resolve();

  socket.on("error", (err) => {
    console.error("Storage connection lost", err);
    resetDefer.resolve("reset");
    exports._connected = false;
    setTimeout(exports._connect, 1000);
  });
  socket.on("end", () => {
    console.error("Storage connection lost");
    resetDefer.resolve("reset");
    exports._connected = false;
    setTimeout(exports._connect, 1000);
  });

  return defer.defer;
}
