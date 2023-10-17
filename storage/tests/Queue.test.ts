import { Queue } from "@/Queue";

describe("Queue", () => {
  test("Queue", () => {
    const queue = new Queue();
    queue.add("usersLegacy", "1", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(1);
    queue.fetch("usersLegacy", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(0);
    expect(queue.queues["usersLegacy"].processing.length).toBe(1);
    queue.markDone("usersLegacy", "1", () => {});
    expect(queue.queues["usersLegacy"].processing.length).toBe(0);
    queue.addMulti("usersLegacy", ["1", "2", "3"], () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(3);
    queue.whenAllDone("usersLegacy", (_, result) => {
      expect(result).toBe(true);
    });
    expect(queue.queues["usersLegacy"].pending.length).toBe(3);
    queue.reset("usersLegacy", () => {});
    expect(queue.queues["usersLegacy"].pending.length).toBe(0);
  });
});
