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
    listener: (data: { channel: string; data: unknown }) => void,
  ): () => void;
  publish: (channel: string, data: unknown, cb?: CallBack) => void;
  [name: string]: (cb?: CallBack, ...args) => void;
};

type RpcResponse = {
  id: string;
  error?: Error;
  result?: object;
};
