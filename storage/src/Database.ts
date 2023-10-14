import { common } from "@neo-screeps/common";
import fs from "fs";
import Q from "q";
import _ from "lodash";
import Loki, { Collection } from "lokijs";

const config = common.configManager.config;

export class DataBase {
  public db: Loki | undefined;
  public getDb(): Loki {
    try {
      fs.statSync(process.env.DB_PATH!);
    } catch (e) {
      fs.writeFileSync(process.env.DB_PATH!, "");
    }
    return new Loki(process.env.DB_PATH!, config.storage.dbOptions);
  }
  public loadDb(): Q.Promise<unknown> {
    this.db = this.getDb();
    return Q.ninvoke(this.db, "loadDatabase", {}).then(this.upgradeDb);
  }
  public upgradeDb(): void {
    let upgradeInterval: NodeJS.Timeout;
    if (process.send) {
      upgradeInterval = setInterval(function () {
        process.send!("storageUpgrading");
      }, 1000);
    }
    const env = this.db!.getCollection("env");
    const envData = env.get(1);
    if (!envData) {
      return;
    }
    if (upgradeInterval!) {
      clearInterval(upgradeInterval);
    }
  }
  public updateDocument(doc: object, update: Data): void {
    if (update.$set) {
      _.extend(doc, update.$set);
    }
    if (update.$merge) {
      _.merge(doc, update.$merge);
    }
    if (update.$inc) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      _.forEach(update.$inc, (val, key) => (doc[key] = (doc[key] || 0) + val));
    }
    if (update.$unset) {
      for (const j in update.$unset) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete doc[j];
      }
    }
    if (update.$addToSet) {
      for (const i in update.$addToSet) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (!doc[i]) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          doc[i] = [];
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (doc[i].indexOf(update.$addToSet[i]) == -1) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          doc[i].push(update.$addToSet[i]);
        }
      }
    }
    if (update.$pull) {
      for (const i in update.$pull) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (!doc[i]) {
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const idx = doc[i].indexOf(update.$pull[i]);
        if (idx != -1) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          doc[i].splice(idx, 1);
        }
      }
    }
  }

  public getRandomString(): string {
    let val;
    for (
      val = Math.floor(Math.random() * 0x10000).toString(16);
      val.length < 4;
      val = "0" + val
    );
    return val;
  }

  public genId(obj: object): string {
    const id =
      this.getRandomString() +
      Date.now().toString(16).slice(4) +
      this.getRandomString();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (obj && !obj._id) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      obj._id = id;
    }
    return id;
  }

  public getOrAddCollection(collectionName: string): Collection {
    let collection = this.db!.getCollection(collectionName);
    if (!collection) {
      collection = this.db!.addCollection(collectionName);
    }
    collection.ensureUniqueIndex("_id");
    switch (collectionName) {
      case "users": {
        collection.ensureIndex("username");
        break;
      }
    }
    return collection;
  }

  public recursReplaceNeNull(val: Data): void {
    if (!_.isObject(val)) {
      return;
    }

    for (const i in val) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (_.isEqual(val[i], { $ne: null }) && !val.$and) {
        val.$and = [{ [i]: { $ne: null } }, { [i]: { $ne: undefined } }];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete val[i];
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (_.isEqual(val[i], { $eq: null }) && !val.$or) {
        val.$or = [{ [i]: { $eq: null } }, { [i]: { $eq: undefined } }];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete val[i];
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.recursReplaceNeNull(val[i]);
    }
  }
  public dbRequest(
    collectionName: string,
    method: string,
    argsArray: (object | object[])[],
    cb: (message: string | null, obj?: object) => void,
  ): void {
    try {
      const collection = this.getOrAddCollection(collectionName);
      if (method == "insert") {
        if (_.isArray(argsArray[0])) {
          argsArray[0].forEach((obj) => this.genId(obj));
        } else {
          this.genId(argsArray[0]);
        }
      }

      if (
        method == "find" ||
        method == "findOne" ||
        method == "count" ||
        method == "removeWhere"
      ) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.recursReplaceNeNull(argsArray[0]);
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line prefer-spread
      const result = collection[method].apply(collection, argsArray);
      cb(null, result);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbUpdate(
    collectionName: string,
    query: Data,
    update: Data,
    params: { upsert?: boolean } | null,
    cb: (message: string | null, obj?: object) => void,
  ): void {
    try {
      this.recursReplaceNeNull(query);
      const collection = this.getOrAddCollection(collectionName);
      let result = [];
      if (
        Object.keys(query).length == 1 &&
        query._id &&
        _.isString(query._id)
      ) {
        const found = collection.by("_id", query._id);
        if (found) {
          result = [found];
        }
      } else {
        result = collection.find(query);
      }
      if (result.length) {
        result.forEach((doc) => {
          this.updateDocument(doc, update);
          collection.update(doc);
        });
        cb(null, { modified: result.length });
      } else if (params && params.upsert) {
        const item = {};
        if (query.$and) {
          query.$and.forEach((i) => _.extend(item, i));
        } else {
          _.extend(item, query);
        }
        this.updateDocument(item, update);
        this.genId(item);
        collection.insert(item);
        cb(null, { inserted: 1 });
      } else {
        cb(null, {});
      }
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }
}
