type Data = {
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
  [op: keyof LokiOps]: DataType;
  [propName: string]: DataType;
};

type DataType = object | number | string | null | Data;
