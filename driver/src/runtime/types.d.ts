import IsolatedVM from "isolated-vm";

declare namespace NodeJS {
  // 全局对象
  interface RuntimeGlobal {
    _ivm?: IsolatedVM;
    _isolate?: IsolatedVM.Isolate;
    _context?: IsolatedVM.Context;
    _init?: () => void;
    _evalFn?: (fnString: string) => void;
    _start?: (data: IntentData) => void;
    _setStaticTerrainData?: (
      buffer: ArrayBufferLike,
      roomOffsets: RoomOffsets,
    ) => void;

    ivm: IsolatedVM;
    isolate: IsolatedVM.Isolate;
    context: IsolatedVM.Context;
    intents: Intents;
    startTime: number;
    startDirtyTime: number | undefined;
    activeSegments: number[] | undefined;
    activeForeignSegment: { username: string; id: number } | undefined;
    defaultPublicSegment: number | undefined;
    publicSegments: number[] | undefined;
    rawMemory: RawMemory;
    outMessage: OutMessage;
    segmentKeys: string[];

    nowCpuTime: () => number;
    getUsedCpu: () => number;
  }
}

type VM = {
  isolate: IsolatedVM.Isolate;
  context?: IsolatedVM.Context;
  promise?: Promise<void>;
  ready: boolean;
  codeTimestamp: number;
  lastUsed: number;
  didHaltByUserRequest?: boolean;
  start?: (data: IntentData) => void;
  evalFn?: () => void;
};

type Metric = {
  userId: string;
  codeTimestamp: number;
  lastUsed: number;
  heap: IsolatedVM.HeapStatistics;
};

type EngineConfig = {
  reportMemoryUsageInterval: number;
  enableInspector: boolean;
};

type Config = {
  engine: EngineConfig;
};

export type StaticTerrainData = {
  buffer: ArrayBufferLike;
  roomOffsets: RoomOffsets;
};

export type RoomOffsets = { [room: string]: number };

type Intents = {
  list: { [id: string]: IntentList | IntentMap };
  cpu: number;
  set: (id: string, name: string, data: IntentData) => void;
  push: (name: string, data: IntentData, maxLen: number) => boolean;
  pushByName: (
    id: string,
    name: string,
    data: IntentData,
    maxLen: number,
  ) => boolean;
  remove: (id: string, name: string) => boolean;
};

type IntentData = {
  userMemory: UserMemory;
  memorySegments: string[];
  foreignMemorySegment: string[];
};
type IntentList = IntentData[];
type IntentMap = { [name: string]: IntentData };
type UserMemory = { [name: string]: string | number | object };
type RawMemory = {
  segments: { [segmentId: number]: string };
  foreignSegment: {
    username: string;
    id: number;
    data: string;
  };
  _parsed: NonNullable<unknown>;
};

type OutMessage = {
  type: string;
  error: string;
  memorySegments: { [segmentId: number]: string };
  usedTime: number;
  usedDirtyTime: number;
  intentsCpu: number;
  memory: UserMemory;
  console: {
    log: () => void;
    results: () => void;
  };
  activeSegments: number[] | undefined;
  activeForeignSegment: { username: string; id: number } | undefined;
  defaultPublicSegment: number | undefined;
  publicSegments: string | undefined;
};
