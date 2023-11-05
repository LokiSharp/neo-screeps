import EventEmitter from "events";

export type Data = {
  [propName: string]: DataType;
} & {
  [op in keyof LokiOps]?: DataType;
} & {
  $set?: { [key: string]: DataType };
  $merge?: { [key: string]: DataType };
  $inc?: { [key: string]: DataType };
  $unset?: { [key: string]: DataType };
  $addToSet?: { [key: string]: DataType };
  $pull?: { [key: string]: DataType };
  $and?: [DataType, DataType];
  $or?: [DataType, DataType];
  $not?: [DataType, DataType];
  _id?: string;
};

export type CallBack = (
  message: string | null,
  obj?: string | boolean | number | object,
) => void;

export type DataType = object | number | string | null | Data;

export type Method = "insert" | "find" | "findOne" | "count" | "removeWhere";

export type BulkData = { op: BulkOp; id?: string; update?: Data; data?: Data };

export type BulkOp = "update" | "insert" | "remove";

export type FindOps = {
  sort?: { [data: string]: number };
  offset?: number;
  limit?: number;
};

export type QueueObj = {
  pending: [];
  processing: [];
  emitter: EventEmitter;
};

export type QueueName = "usersLegacy" | "usersIvm" | "rooms";
