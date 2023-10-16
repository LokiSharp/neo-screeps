import EventEmitter from "events";

export class PubSub {
  private subs: [
    (string | symbol)?,
    ((data: { channel: string; data: unknown }) => void)?,
  ][] = [];
  private id = 0;
  private emitter = new EventEmitter();

  public create(): {
    methods: {
      subscribe(
        channel: string,
        listener: (data: { channel: string; data: unknown }) => void,
      ): () => void;
      publish: (channel: string, data: unknown, cb?: CallBack) => void;
    };
    close(): void;
  } {
    const connId = this.id++;
    const connSubs: [
      (string | symbol)?,
      ((data: { channel: string; data: unknown }) => void)?,
    ][] = (this.subs[this.id] = []);
    const emitter = this.emitter;
    const subs = this.subs;
    return {
      methods: {
        publish(channel: string, data: unknown, cb?: CallBack): void {
          emitter.emit(channel, { channel, data });
          emitter.emit("*", { channel, data });
          cb && cb(null);
        },
        subscribe(
          channel: string,
          listener: (data: { channel: string; data: unknown }) => void,
        ): () => void {
          connSubs.push([channel, listener]);
          emitter.on(channel, listener);
          return (): void => {
            emitter.removeListener(channel, listener);
          };
        },
      },
      close(): void {
        connSubs.forEach((i) => emitter.removeListener(i[0]!, i[1]!));
        delete subs[connId];
      },
    };
  }
}
