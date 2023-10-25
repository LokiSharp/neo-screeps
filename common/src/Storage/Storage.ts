import { Socket, connect } from "net";
import { RpcClient } from "@/Rpc/RpcClient";
import { config } from "@/ConfigManager";
import { makeDefer } from "@/utils";
import { DataBaseStorage } from "@/configs/dbCollections";
import { EnvStorage } from "@/Storage/EnvStorage";

export class Storage {
  private _connected = false;
  public db: DataBaseStorage = {} as DataBaseStorage;
  public queue = {};
  public env: EnvStorage = {
    keys: {
      ACCESSIBLE_ROOMS: "accessibleRooms",
      ROOM_STATUS_DATA: "roomStatusData",
      MEMORY: "memory:",
      GAME_TIME: "gameTime",
      MAP_VIEW: "mapView:",
      TERRAIN_DATA: "terrainData",
      SCRIPT_CACHED_DATA: "scriptCachedData:",
      USER_ONLINE: "userOnline:",
      MAIN_LOOP_PAUSED: "mainLoopPaused",
      ROOM_HISTORY: "roomHistory:",
      ROOM_VISUAL: "roomVisual:",
      MEMORY_SEGMENTS: "memorySegments:",
      PUBLIC_MEMORY_SEGMENTS: "publicMemorySegments:",
      ROOM_EVENT_LOG: "roomEventLog:",
      ACTIVE_ROOMS: "activeRooms",
      MAIN_LOOP_MIN_DURATION: "tickRate",
    },
  } as unknown as EnvStorage;
  public pubSub = {
    keys: {
      QUEUE_DONE: "queueDone:",
      RUNTIME_RESTART: "runtimeRestart",
      TICK_STARTED: "tickStarted",
      ROOMS_DONE: "roomsDone",
    },
  };
  public socket?: Socket;
  public resetAllData?: () => Defer;

  public storageConnect(): Promise<string | undefined> {
    if (this._connected) {
      return new Promise<string | undefined>(() => {});
    }

    if (!process.env.STORAGE_PORT) {
      throw new Error("STORAGE_PORT environment variable is not set!");
    }

    console.log("Connecting to storage");

    this.socket = connect(
      parseInt(process.env.STORAGE_PORT!),
      process.env.STORAGE_HOST,
    );
    const rpcClient = new RpcClient(this.socket);

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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (i) => (this.db[i] = wrapCollection(i)),
    );

    this.resetAllData = (): Defer => rpcClient.request("dbResetAllData");

    Object.assign(this.queue, {
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

    Object.assign(this.env, {
      get: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvGet")),
      mget: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvMget")),
      set: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvSet")),
      setex: resetInterceptor(rpcClient.request.bind(rpcClient, "dbEnvSetex")),
      expire: resetInterceptor(
        rpcClient.request.bind(rpcClient, "dbEnvExpire"),
      ),
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

    Object.assign(this.pubSub, {
      publish: resetInterceptor(rpcClient.request.bind(rpcClient, "publish")),
      subscribe(channel: string, cb: (...args: unknown[]) => void) {
        rpcClient.subscribe(channel, cb);
      },
    });

    this._connected = true;

    defer.resolve();

    this.socket.on("error", (err) => {
      console.error("Storage connection lost", err);
      resetDefer.resolve("reset");
      exports._connected = false;
      setTimeout(exports._connect, 1000);
    });
    this.socket.on("end", () => {
      console.error("Storage connection lost");
      resetDefer.resolve("reset");
      exports._connected = false;
      setTimeout(exports._connect, 1000);
    });

    return defer.defer;
  }
}
