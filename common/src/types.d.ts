type Frame = { data: Buffer; pointer: number; size?: number };

type RpcServerFrameObj = {
  method: string;
  channel: string;
  id: string;
  args: unknown[];
};

type RpcClientFrameObj = {
  id: string;
  error?: Error;
  result?: object;
  pubSub: ChildProcess;
};

type RpcMethods = {
  subscribe(
    channel: string,
    listener: (data: { channel: string; data: string }) => void,
  ): () => void;
  publish: (channel: string, data: string, cb?: CallBack) => void;
  [name: string]: (cb?: CallBack, ...args) => void;
};

type RpcResponse = {
  id: string;
  error?: Error;
  result?: object;
};

type Defer = {
  defer: Promise<string | undefined>;
  reject: Reject;
  resolve: Resolve;
};
type Reject = (reason?: Error) => void;
type Resolve = (value?: string) => void;

type DataBaseObject = { [K in DataBaseMethod]: (...args) => Defer };
type DataBaseMethod =
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

type Terrain = { type: string; x: number; y: number; room?: string };
