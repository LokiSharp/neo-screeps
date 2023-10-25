import { Socket } from "net";
import { JSONFrameStream } from "@/Rpc/JSONFrameStream";

export class RpcServer {
  public socket: Socket;
  public methods: RpcMethods;
  public channelUnsubscribe: Map<string, () => void>;
  public constructor(socket: Socket, methods: RpcMethods) {
    this.socket = socket;
    this.socket.pipe(
      new JSONFrameStream(
        (this._processFrame as (obj: object) => void).bind(this),
      ),
    );
    this.methods = methods;
    this.channelUnsubscribe = new Map();
    this.socket.on("close", () => {
      this.channelUnsubscribe.forEach((unsubscribe) => unsubscribe());
      this.channelUnsubscribe.clear();
    });
  }

  public _processFrame(obj: RpcServerFrameObj): void {
    const args = obj.args || [];
    if (obj.method === "subscribe") {
      if (this.channelUnsubscribe.has("*")) {
        return;
      }
      if (obj.channel === "*") {
        this.channelUnsubscribe.forEach((unsubscribe) => unsubscribe());
        this.channelUnsubscribe.clear();
      }
      if (!this.channelUnsubscribe.has(obj.channel)) {
        const unsubscribe = this.methods.subscribe(obj.channel, (pubSub) => {
          this.socket.write(JSONFrameStream.makeFrame({ pubSub }));
        });
        this.channelUnsubscribe.set(obj.channel, unsubscribe);
      }
      this.socket.write("");
      return;
    }
    this.methods[obj.method].apply(
      null,
      args.concat([
        (error: Error, result: object): void => {
          const response: RpcResponse = { id: obj.id };
          if (error) {
            response.error = error;
          } else {
            response.result = result;
          }
          this.socket.write(JSONFrameStream.makeFrame(response));
        },
      ]),
    );
  }
}
