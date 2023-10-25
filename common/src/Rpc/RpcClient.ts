import { Socket } from "net";
import { EventEmitter } from "events";
import { JSONFrameStream } from "@/Rpc/JSONFrameStream";
import { makeDefer } from "@/utils";

export class RpcClient {
  public socket: Socket;
  public requestId: number;
  public defers: Map<string, Defer>;
  public pubSub: EventEmitter;

  public constructor(socket: Socket) {
    this.socket = socket;
    this.socket.pipe(
      new JSONFrameStream(
        (this._processFrame as (obj: object) => void).bind(this),
      ),
    );
    this.requestId = 0;
    this.defers = new Map<string, Defer>();
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
      this.defers.get(String(obj.id))!.resolve(obj.result as unknown as string);
    }
    this.defers.delete(String(obj.id));
  }

  public request(method: string, ...args: unknown[]): Defer {
    this.requestId++;
    const request = {
      id: this.requestId,
      method,
      args,
    };
    this.socket.write(JSONFrameStream.makeFrame(request));
    const defered = makeDefer();
    this.defers.set(String(this.requestId), defered);
    return defered;
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
