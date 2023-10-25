export const dbCollections = ["users", "rooms"] as const;

export type DataBaseStorage = {
  [K in (typeof dbCollections)[number]]: DataBaseObject;
};
