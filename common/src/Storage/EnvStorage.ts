export interface EnvStorage {
  keys: { [key: string]: string };
  get(...args: unknown[]): Defer;
}
