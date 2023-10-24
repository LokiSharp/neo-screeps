import { dbCollections } from "@/configs/dbCollections";

export type Frame = { data: Buffer; pointer: number; size?: number };

export type RpcServerFrameObj = {
  method: string;
  channel: string;
  id: string;
  args: unknown[];
};

export type RpcClientFrameObj = {
  id: string;
  error?: Error;
  result?: object;
  pubSub: ChildProcess;
};

export type RpcMethods = {
  subscribe(
    channel: string,
    listener: (data: { channel: string; data: unknown }) => void,
  ): () => void;
  publish: (channel: string, data: unknown, cb?: CallBack) => void;
  [name: string]: (cb?: CallBack, ...args) => void;
};

export type RpcResponse = {
  id: string;
  error?: Error;
  result?: object;
};

export type Defer = {
  defer: Promise<unknown>;
  reject: Reject;
  resolve: Resolve;
};
export type Reject = (reason?: Error) => void;
export type Resolve = (value?: string) => void;

export type DataBaseStorage = {
  [K in (typeof dbCollections)[number]]: DataBaseObject;
};
export type DataBaseObject = { [K in DataBaseMethod]: (...args) => Defer };
export type DataBaseMethod =
  | "find"
  | "findOne"
  | "by"
  | "clear"
  | "count"
  | "ensureIndex"
  | "removeWhere"
  | "insert"
  | "update"
  | "bulk"
  | "findEx";

export type Terrain = { type: string; x: number; y: number; room?: string };
