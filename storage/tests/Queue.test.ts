import { Queue } from "@/Queue";

const queue = new Queue();

describe("Queue", () => {
  test("Queue", () => {
    queue.queueAdd("usersLegacy", "1", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(1);
    queue.queueFetch("usersLegacy", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(0);
    expect(queue.queues["usersLegacy"].processing.length).toBe(1);
    queue.queueMarkDone("usersLegacy", "1", () => {});
    expect(queue.queues["usersLegacy"].processing.length).toBe(0);
    queue.queueAddMulti("usersLegacy", ["1", "2", "3"], () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(3);
    queue.queueWhenAllDone("usersLegacy", (_, result) => {
      expect(result).toBe(true);
    });
    expect(queue.queues["usersLegacy"].pending.length).toBe(3);
    queue.queueReset("usersLegacy", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(0);
  });

  test("Queue toObject", () => {
    const queueObj = queue.toObject();
    console.log(queueObj);
  });
});
