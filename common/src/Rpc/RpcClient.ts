import { Socket } from "net";
import { EventEmitter } from "events";
import { JSONFrameStream } from "@/Rpc/JSONFrameStream";

export class RpcClient {
  public socket: Socket;
  public requestId: number;
  public defers: Map<
    string,
    {
      defer: Promise<unknown>;
      reject: (reason?: Error | undefined) => void;
      resolve: (value?: object) => void;
    }
  >;
  public pubSub: EventEmitter;

  public constructor(socket: Socket) {
    this.socket = socket;
    this.socket.pipe(
      new JSONFrameStream(
        (this._processFrame as (obj: object) => void).bind(this),
      ),
    );
    this.requestId = 0;
    this.defers = new Map();
    this.pubSub = new EventEmitter();
  }

  public _processFrame(obj: RpcClientFrameObj): void {
    if (obj.pubSub) {
      this.pubSub.emit(obj.pubSub.channel, obj.pubSub.channel, obj.pubSub.data);
      this.pubSub.emit("*", obj.pubSub.channel, obj.pubSub.data);
      return;
    }
    if (!this.defers.has(String(obj.id))) {
      console.error("invalid request id", obj.id);
      return;
    }
    if (obj.error) {
      this.defers.get(String(obj.id))!.reject(obj.error);
    } else {
      this.defers.get(String(obj.id))!.resolve(obj.result);
    }
    this.defers.delete(String(obj.id));
  }

  public request(
    method: string,
    ...args: unknown[]
  ): {
    defer: Promise<unknown>;
    reject: (reason?: Error) => void;
    resolve: (value?: object) => void;
  } {
    this.requestId++;
    const request = {
      id: this.requestId,
      method,
      args,
    };
    let resolve = ((): void => {}) as (value?: object) => void,
      reject = ((): void => {}) as (reason?: Error) => void;
    this.socket.write(JSONFrameStream.makeFrame(request));
    const defer = new Promise((res, rej) => {
      [resolve, reject] = [res, rej];
    });
    this.defers.set(String(this.requestId), { defer, reject, resolve });
    return { defer, reject, resolve };
  }

  public subscribe(
    channelToSubscribe: string,
    callback: (...args: unknown[]) => void,
  ): void {
    const request = {
      method: "subscribe",
      channel: channelToSubscribe,
    };
    this.socket.write(JSONFrameStream.makeFrame(request));
    this.pubSub.addListener(
      channelToSubscribe,
      (channel: string, ...args: unknown[]) => {
        callback.apply({ channel }, args);
      },
    );
  }
}
