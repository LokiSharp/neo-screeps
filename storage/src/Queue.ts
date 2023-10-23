import EventEmitter from "events";
import { PubSub } from "@/PubSub";
import _ from "lodash";

class QueueObj {
  public pending: string[] = [];
  public processing: string[] = [];
  public emitter = new EventEmitter();
}

export class Queue {
  public queues: { [name: string]: QueueObj } = {
    usersLegacy: new QueueObj(),
    usersIvm: new QueueObj(),
    rooms: new QueueObj(),
  };

  public pubSub = new PubSub().create();

  public toObject(): object {
    const originalClass = this || {};
    const keys = [
      "queueFetch",
      "queueAdd",
      "queueAddMulti",
      "queueMarkDone",
      "queueReset",
    ];
    return keys.reduce(
      (classAsObj: { [name: string]: () => void }, key: string) => {
        classAsObj[key] = (
          originalClass as unknown as { [name: string]: () => void }
        )[key].bind(originalClass);
        return classAsObj;
      },
      {},
    );
  }

  public queueAdd(name: QueueName, id: string, cb: CallBack): void {
    try {
      this.queues[name].pending.push(id);
      this.queues[name].emitter.emit("add");
      cb && cb(null, true);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public queueFetch(name: string, cb: CallBack): void {
    try {
      const check = (): void => {
        if (!this.queues[name].pending.length) {
          this.queues[name].emitter.once("add", check);
          return;
        }
        const item = this.queues[name].pending.pop();
        this.queues[name].processing.push(item!);
        cb(null, item);
      };
      check();
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public queueAddMulti(name: QueueName, array: string[], cb: CallBack): void {
    try {
      this.queues[name].pending = this.queues[name].pending.concat(array);
      this.queues[name].emitter.emit("add");
      cb && cb(null, true);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public queueMarkDone(name: QueueName, id: string, cb: CallBack): void {
    try {
      _.pull(this.queues[name].processing, id);
      this.queues[name].emitter.emit("done");
      cb && cb(null, true);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public queueWhenAllDone(name: QueueName, cb: CallBack): void {
    try {
      const check = (): void => {
        if (
          this.queues[name].pending.length ||
          this.queues[name].processing.length
        ) {
          this.queues[name].emitter.once("done", check);
          return;
        }
        this.pubSub.methods.publish("queueDone:" + name, "1");
        cb(null, true);
      };
      check();
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public queueReset(name: QueueName, cb: CallBack): void {
    try {
      this.queues[name].pending = [];
      this.queues[name].processing = [];
      this.queues[name].emitter.emit("done");
      cb && cb(null, true);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }
}
