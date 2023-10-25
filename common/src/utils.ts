export function makeDefer(): Defer {
  let resolve = ((): void => {}) as Resolve,
    reject = ((): void => {}) as Reject;
  const defer: Promise<string | undefined> = new Promise((res, rej) => {
    [resolve, reject] = [res, rej];
  });
  return { defer, reject, resolve };
}
