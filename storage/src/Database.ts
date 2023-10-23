import { common } from "@neo-screeps/common";
import fs from "fs";
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
    return new Loki(process.env.DB_PATH!, config.common.storage.dbOptions);
  }
  public loadDb(): Promise<void> {
    this.db = this.getDb();
    return new Promise(() => {
      this.db?.loadDatabase({});
      this.upgradeDb();
    });
  }
  public closeDb(): Promise<void> {
    return new Promise(() => {
      this.db?.close();
    });
  }

  public upgradeDb(): Promise<void> {
    return new Promise(() => {
      let env = this.db!.getCollection("env");
      if (!env) {
        this.db?.addCollection("env");
        env = this.db!.getCollection("env");
      }
      const envData = env.get(1);
      if (!envData) {
        return;
      }
    });
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
    let val = Math.floor(Math.random() * 0x10000).toString(16);
    while (val.length < 4) {
      val = "0" + val;
    }
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
    method: Method,
    argsArray: (object | object[])[],
    cb: CallBack,
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
    cb: CallBack,
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

  public dbBulk(collectionName: string, bulk: BulkData[], cb: CallBack): void {
    try {
      const collection = this.getOrAddCollection(collectionName);
      let result;
      bulk.forEach((i) => {
        switch (i.op) {
          case "update": {
            const target = collection.by("_id", i.id);
            if (target) {
              this.updateDocument(target, i.update!);
              result = collection.update(target);
            }
            break;
          }
          case "insert": {
            this.genId(i.data!);
            result = collection.insert(i.data);
            break;
          }
          case "remove": {
            const target = collection.by("_id", i.id);
            if (target) {
              result = collection.remove(target);
            }
            break;
          }
        }
      });
      cb(null, result);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbFindEx(
    collectionName: string,
    query: Data,
    opts: FindOps,
    cb: CallBack,
  ): void {
    try {
      this.recursReplaceNeNull(query);
      const collection = this.getOrAddCollection(collectionName);
      let chain = collection.chain().find(query);
      if (opts.sort) {
        for (const field in opts.sort) {
          chain = chain.simplesort(field, opts.sort[field] == -1);
        }
      }
      if (opts.offset) {
        chain = chain.offset(opts.offset);
      }
      if (opts.limit) {
        chain = chain.limit(opts.limit);
      }
      cb(null, chain.data());
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvSet(name: string, value: string, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      let values = env.get(1);
      if (values) {
        values.data[name] = value;
        env.update(values);
      } else {
        values = { data: { [name]: value } };
        env.insert(values);
      }
      cb && cb(null, value);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvSetEx(
    name: string,
    seconds: number,
    value: string,
    cb: CallBack,
  ): void {
    try {
      this.dbEnvSet(name, value, () => {});
      this.dbEnvExpire(name, seconds, () => {});
      cb(null);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvGet(name: string, cb: CallBack): void {
    try {
      const item = this.db!.getCollection("env").get(1) || { data: {} };
      cb(null, item.data[name]);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvMGet(names: string[], cb: CallBack): void {
    try {
      const item = this.db!.getCollection("env").get(1) || { data: {} };
      const result = names.map((name) => item.data[name]);
      cb(null, result);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvExpire(name: string, seconds: number, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      let expiration = env.get(2);
      if (expiration) {
        expiration.data[name] = Date.now() + seconds * 1000;
        env.update(expiration);
      } else {
        expiration = { data: { [name]: Date.now() + seconds * 1000 } };
        env.insert(expiration);
      }
      cb && cb(null);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvTtl(name: string, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      const expiration = env.get(2);
      if (
        !expiration ||
        !expiration.data[name] ||
        expiration.data[name] < Date.now()
      ) {
        cb(null, -1);
        return;
      }
      cb(null, (expiration.data[name] - Date.now()) / 1000);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvDel(name: string, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      const values = env.get(1);
      if (values && values.data[name]) {
        delete values.data[name];
        cb(null, 1);
      } else {
        cb(null, 0);
      }
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvHSet(
    name: string,
    field: string,
    value: string,
    cb: CallBack,
  ): void {
    try {
      const env = this.db!.getCollection("env");
      let values = env.get(1);
      if (values) {
        values.data[name] = values.data[name] || {};
        values.data[name][field] = value;
        env.update(values);
      } else {
        values = { data: { [name]: { [field]: value } } };
        env.insert(values);
      }
      cb(null, values.data[name][field]);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvHGet(name: string, field: string, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      const values = env.get(1);
      if (values && values.data && values.data[name]) {
        cb(null, values.data[name][field]);
      } else {
        cb(null);
      }
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvHMSet(
    name: string,
    data: { [key: string]: string },
    cb: CallBack,
  ): void {
    try {
      const env = this.db!.getCollection("env");
      let values = env.get(1);
      if (values) {
        values.data[name] = values.data[name] || {};
        _.extend(values.data[name], data);
        env.update(values);
      } else {
        values = { data: { [name]: data } };
        env.insert(values);
      }
      cb(null, values.data[name]);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvHMGet(name: string, fields: string[], cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      const values = env.get(1) || { data: {} };
      values.data[name] = values.data[name] || {};
      const result = fields.map((i) => values.data[name][i]);
      cb(null, result);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvSAdd(
    name: string,
    data: (string | number)[],
    cb: CallBack,
  ): void {
    try {
      if (!_.isArray(data)) {
        data = [data];
      }

      const env = this.db!.getCollection("env");
      let values = env.get(1);
      if (values) {
        values.data[name] = values.data[name] || [];
        _.forEach(data, (i) => {
          if (!_.includes(values.data[name], i)) {
            values.data[name].push(i);
          }
        });

        env.update(values);
      } else {
        values = { data: { [name]: data } };
        env.insert(values);
      }
      cb(null, values.data[name]);
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }

  public dbEnvSMembers(name: string, cb: CallBack): void {
    try {
      const env = this.db!.getCollection("env");
      const values = env.get(1) || { data: {} };
      if (values && values.data && values.data[name]) {
        cb(null, values.data[name]);
      } else {
        cb(null);
      }
    } catch (e) {
      cb((e as Error).message);
      console.error(e);
    }
  }
}
