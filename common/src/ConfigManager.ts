import { constants } from "@/configs/constants";
import { storage } from "@/configs/storage";
import { dbCollections } from "@/configs/dbCollections";
import { engine } from "@/configs/engine";

export class ConfigManager {
  public config = new Config();
}

class Config {
  public common = {
    constants: constants,
    storage: storage,
    dbCollections: dbCollections,
    system: {},
  };
  public engine = engine;
}
