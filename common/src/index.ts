import { ConfigManager } from "@/ConfigManager";
export { RpcServer } from "@/Rpc/RpcServer";
export { RpcClient } from "@/Rpc/RpcClient";
import * as storage from "@/Storage";
import { JSONFrameStream } from "@/Rpc/JSONFrameStream";
import { RpcServer } from "@/Rpc/RpcServer";
import { RpcClient } from "@/Rpc/RpcClient";
import { Defer, Terrain } from "@/types";
import { makeDefer } from "@/utils";
import { createServer } from "net";
import * as _ from "lodash";

export class Common {
  public configManager = new ConfigManager();
  public storage = storage;
  public rpc = {
    JSONFrameStream,
    RpcServer,
    RpcClient,
  };
  public findPort(port: number): Defer {
    const defer = makeDefer();
    const server = createServer((socket) => socket.end());
    server.listen(port, (): void => {
      server.once("close", (): void => {
        defer.resolve(String(port));
      });
      server.close();
    });
    server.on("error", (): void => {
      defer.resolve(String(this.findPort.bind(this)(port + 1)));
    });
    return defer;
  }

  public encodeTerrain(terrain: Terrain[]): string {
    let result = "";
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const objects = _.filter(terrain, { x, y });
        let code = 0;
        if (_.some(objects, { type: "wall" })) {
          code = code | 1;
        }
        if (_.some(objects, { type: "swamp" })) {
          code = code | 2;
        }
        result = result + code;
      }
    }
    return result;
  }

  public decodeTerrain(str: string, room: string): Terrain[] {
    const result = [];

    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        const code = str.charAt(y * 50 + x);
        if (code && 1) {
          result.push({ room, x, y, type: "wall" });
        }
        if (code && 2) {
          result.push({ room, x, y, type: "swamp" });
        }
      }
    }
    return result;
  }

  public checkTerrain(
    terrainStr: string,
    x: number,
    y: number,
    mask: number,
  ): boolean {
    return (parseInt(terrainStr.charAt(y * 50 + x)) & mask) > 0;
  }
}
