import { DataBase } from "@/Database";
import fs from "fs";

const OLD_ENV = process.env;

let db: DataBase;

beforeAll(() => {
  process.env = { ...OLD_ENV }; // Make a copy
  process.env.DB_PATH = "tmp/db.json";
  fs.mkdirSync("tmp/", { recursive: true });
});

beforeEach(() => {
  db = new DataBase();
  db.loadDb();
  expect(db.db).not.toBeNull();
});

afterEach(() => {
  db.closeDb();
  fs.rmSync("tmp/db.json", { recursive: true, force: true });
});

afterAll(() => {
  process.env = OLD_ENV; // Restore old environment
  fs.rmSync("tmp/", { recursive: true, force: true });
});

describe("Database", () => {
  test("DataBase", () => {
    expect(db.db).not.toBeUndefined();
  });

  test("DataBase updateDocument $set", () => {
    const doc = {};
    const set1 = { $set: { a: 1 } };
    db.updateDocument(doc, set1);
    expect(doc).toStrictEqual({ a: 1 });

    const set2 = { $set: { a: 2, b: 2 } };
    db.updateDocument(doc, set2);
    expect(doc).toStrictEqual({ a: 2, b: 2 });

    const set3 = { $set: { c: { c1: 1, c2: 2 } } };
    db.updateDocument(doc, set3);
    expect(doc).toStrictEqual({ a: 2, b: 2, c: { c1: 1, c2: 2 } });
  });

  test("DataBase updateDocument $merge", () => {
    const doc = { a: 1 };
    const merge1 = { $merge: { b: { b1: 1, b2: 1 } } };
    db.updateDocument(doc, merge1);
    expect(doc).toStrictEqual({ a: 1, b: { b1: 1, b2: 1 } });
    const merge2 = { $merge: { b: { b3: 1 } } };
    db.updateDocument(doc, merge2);
    expect(doc).toStrictEqual({ a: 1, b: { b1: 1, b2: 1, b3: 1 } });
  });

  test("DataBase updateDocument $inc", () => {
    const doc = { a: 1 };
    const inc1 = { $inc: { a: 1 } };
    db.updateDocument(doc, inc1);
    expect(doc).toStrictEqual({ a: 2 });
    const inc2 = { $inc: { a: 1, b: 1 } };
    db.updateDocument(doc, inc2);
    expect(doc).toStrictEqual({ a: 3, b: 1 });
  });

  test("DataBase updateDocument $unset", () => {
    const doc = { a: 1, b: 2, c: 3 };
    const unset1 = { $unset: { a: null } };
    db.updateDocument(doc, unset1);
    expect(doc).toStrictEqual({ b: 2, c: 3 });
    const unset2 = { $unset: { b: null, c: null } };
    db.updateDocument(doc, unset2);
    expect(doc).toStrictEqual({});
  });

  test("DataBase updateDocument $addToSet", () => {
    const doc = {};
    const addToSet1 = { $addToSet: { a: 1 } };
    db.updateDocument(doc, addToSet1);
    expect(doc).toStrictEqual({ a: [1] });
    const addToSet2 = { $addToSet: { a: 2 } };
    db.updateDocument(doc, addToSet2);
    expect(doc).toStrictEqual({ a: [1, 2] });
    const addToSet3 = { $addToSet: { b: 2, c: 3 } };
    db.updateDocument(doc, addToSet3);
    expect(doc).toStrictEqual({ a: [1, 2], b: [2], c: [3] });
  });

  test("DataBase updateDocument $pull", () => {
    const doc = { a: [1, 2], b: [2], c: [3] };
    const addToSet1 = { $pull: { b: 2, c: 3 } };
    db.updateDocument(doc, addToSet1);
    expect(doc).toStrictEqual({ a: [1, 2], b: [], c: [] });
    const addToSet2 = { $pull: { a: 2 } };
    db.updateDocument(doc, addToSet2);
    expect(doc).toStrictEqual({ a: [1], b: [], c: [] });
    const addToSet3 = { $pull: { a: 1 } };
    db.updateDocument(doc, addToSet3);
    expect(doc).toStrictEqual({ a: [], b: [], c: [] });
    const addToSet4 = { $pull: { d: 1 } };
    db.updateDocument(doc, addToSet4);
    expect(doc).toStrictEqual({ a: [], b: [], c: [] });
  });

  test("DataBase getRandomString", () => {
    const str = db.getRandomString();
    expect(str.length).toBe(4);
  });

  test("DataBase genId", () => {
    const obj = {};
    const str = db.genId(obj);
    expect(str.length).toBe(15);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(obj["_id"] as string).toBe(str);
  });

  test("DataBase getOrAddCollection", () => {
    const collection = db.getOrAddCollection("users");
    expect(collection).not.toBeUndefined();
  });

  test("DataBase recursReplaceNeNull", () => {
    const notObject = "";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    db.recursReplaceNeNull(notObject);
    expect(notObject).toStrictEqual("");
    const eq = { $set: { $eq: null } };
    db.recursReplaceNeNull(eq);
    expect(eq).toStrictEqual({
      $or: [{ $set: { $eq: null } }, { $set: { $eq: undefined } }],
    });
    const ne = { $set: { $ne: null } };
    db.recursReplaceNeNull(ne);
    expect(ne).toStrictEqual({
      $and: [{ $set: { $ne: null } }, { $set: { $ne: undefined } }],
    });
  });

  test("DataBase dbRequest", () => {
    db.dbRequest("users", "insert", [{ name: "Loki", age: 10 }], (_, result) =>
      expect(result).not.toBeUndefined(),
    );
    db.dbRequest("users", "find", [{ age: { $eq: 1 } }], (_, result) =>
      expect(result).not.toBeUndefined(),
    );
  });

  test("DataBase dbUpdate", () => {
    db.dbRequest("users", "insert", [{ name: "Loki", age: 1 }], (_, result) =>
      expect(result).not.toBeUndefined(),
    );
    db.dbUpdate(
      "users",
      { age: { $eq: 1 } },
      { $set: { name: "Thor", age: 35 } },
      { upsert: true },
      (_, result) => {
        expect(result).not.toBeUndefined();
      },
    );
    db.dbRequest("users", "find", [{ age: { $gt: 0 } }], (_, result) => {
      expect((result as Array<unknown>).length).toBe(1);
    });
  });

  test("DataBase dbBulk", () => {
    db.dbBulk(
      "users",
      [
        { op: "insert", data: { name: "Loki", age: 10 } },
        { op: "insert", data: { name: "Thor", age: 20 } },
      ],
      (_, result) => {
        expect(result).not.toBeUndefined();
      },
    );
    const usersId: string[] = [];
    db.dbRequest("users", "find", [{ age: { $gt: 0 } }], (_, result) => {
      (result as { _id: string }[]).forEach((user) => usersId.push(user._id));
      expect((result as Array<unknown>).length).toBe(2);
    });
    db.dbBulk(
      "users",
      [
        {
          op: "update",
          id: usersId[0],
          update: { $set: { age: 100 } },
        },
        {
          op: "update",
          id: usersId[1],
          update: { $set: { age: 0 } },
        },
      ],
      (_, result) => {
        expect(result).not.toBeUndefined();
      },
    );

    db.dbRequest("users", "find", [{ age: { $gt: 50 } }], (_, result) => {
      expect((result as Array<unknown>).length).toBe(1);
    });
    db.dbBulk(
      "users",
      [
        { op: "remove", id: usersId[0] },
        { op: "remove", id: usersId[1] },
      ],
      (_, result) => {
        expect(result).not.toBeUndefined();
      },
    );

    db.dbRequest("users", "find", [{ age: { $gt: 0 } }], (_, result) => {
      expect((result as Array<unknown>).length).toBe(0);
    });
  });

  test("DataBase dbFindEx", () => {
    db.dbRequest(
      "users",
      "insert",
      [
        [
          { name: "Odin", type: "God" },
          { name: "Frigga", type: "God" },
          { name: "Thor", type: "God" },
          { name: "Sif", type: "God" },
          { name: "Loki", type: "God" },
          { name: "Baldur", type: "God" },
          { name: "Hodr", type: "God" },
          { name: "Forseti", type: "God" },
          { name: "Bragi", type: "God" },
          { name: "Iðunn", type: "God" },
          { name: "Njord", type: "God" },
          { name: "Freyr", type: "God" },
          { name: "Freyja", type: "God" },
          { name: "Tyr", type: "God" },
          { name: "Heimdall", type: "God" },
        ],
      ],
      (_, result) => expect(result).not.toBeUndefined(),
    );
    db.dbFindEx(
      "users",
      { type: "God" },
      { sort: { name: 1 } },
      (_, result) => {
        expect(result).not.toBeUndefined();
        expect((result as { name: string; type: string }[])[0].name).toBe(
          "Baldur",
        );
        expect((result as { name: string; type: string }[])[14].name).toBe(
          "Tyr",
        );
      },
    );
    db.dbFindEx(
      "users",
      { type: "God" },
      { sort: { name: 1 }, offset: 2 },
      (_, result) => {
        expect(result).not.toBeUndefined();
        expect((result as []).length).toBe(13);
      },
    );
    db.dbFindEx(
      "users",
      { type: "God" },
      { sort: { name: 1 }, limit: 2 },
      (_, result) => {
        expect(result).not.toBeUndefined();
        expect((result as []).length).toBe(2);
      },
    );
  });

  test("DataBase Env Method", () => {
    db.dbEnvSet("Foo", "1", (_, result) => {
      expect(result).not.toBeUndefined();
    });
    db.dbEnvGet("Foo", (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toBe("1");
    });
    db.dbEnvSet("Bar", "2", (_, result) => {
      expect(result).not.toBeUndefined();
    });
    db.dbEnvMGet(["Foo", "Bar"], (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toStrictEqual(["1", "2"]);
    });
    db.dbEnvDel("Foo", (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toBe(1);
    });
    db.dbEnvDel("Foo", (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toBe(0);
    });
    db.dbEnvSetEx("Foo", 100, "1", () => {});
    db.dbEnvTtl("Foo", () => {});
  });

  test("DataBase Env H Method", () => {
    db.dbEnvHSet("Foo", "Loki", "1", (_, result) => {
      expect(result).not.toBeUndefined();
    });
    db.dbEnvHGet("Foo", "Loki", (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toBe("1");
    });
  });

  test("DataBase Env HM Method", () => {
    db.dbEnvHMSet("Foo", { Loki: "1" }, (_, result) => {
      expect(result).not.toBeUndefined();
    });
    db.dbEnvHMGet("Foo", ["Loki"], (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toStrictEqual(["1"]);
    });
  });

  test("DataBase Env S Method", () => {
    db.dbEnvSAdd("Foo", [1, 2, 3, 4, 5], (_, result) => {
      expect(result).not.toBeUndefined();
    });
    db.dbEnvSMembers("Foo", (_, result) => {
      expect(result).not.toBeUndefined();
      expect(result).toStrictEqual([1, 2, 3, 4, 5]);
    });
  });

  test("DataBase toObject", () => {
    const dbObj = db.toObject();
    console.log(dbObj);
  });
});
