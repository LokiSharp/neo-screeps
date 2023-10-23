import { constants } from "@/configs/constants";
import { storage } from "@/configs/storage";
import { dbCollections } from "@/configs/dbCollections";
import { engine } from "@/configs/engine";

export class ConfigManager {
  public config = config;
}

export const config = {
  common: {
    constants: constants,
    dbCollections: dbCollections,
    system: {},
    storage: storage,
  },
  engine: engine,
};
