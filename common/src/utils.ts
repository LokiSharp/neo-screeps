import { Defer, Reject, Resolve } from "@/types";

export function makeDefer(): Defer {
  let resolve = ((): void => {}) as Resolve,
    reject = ((): void => {}) as Reject;
  const defer = new Promise((res, rej) => {
    [resolve, reject] = [res, rej];
  });
  return { defer, reject, resolve };
}
