/* eslint-disable  */
// @ts-ignore
import { IntentData, IntentList, IntentMap, NodeJS, RoomOffsets, UserMemory } from "@/runtime/types.d.ts";
import RuntimeGlobal = NodeJS.RuntimeGlobal;
import _ from "lodash";

const staticTerrainData: { [room: string]: Uint8Array } = {};

declare const globalThis: RuntimeGlobal;
export const init = (): void => {
  globalThis.isolate = globalThis._isolate!;
  globalThis.context = globalThis._context!;
  globalThis.ivm = globalThis._ivm!;

  globalThis.nowCpuTime = (): number => {
    // @ts-ignore
    return globalThis.isolate.cpuTime[0] * 1e3 + globalThis.isolate.cpuTime[1] / 1e6;
  }
  globalThis.getUsedCpu = (): number => {
    return globalThis.nowCpuTime() + globalThis.intents!.cpu - globalThis.startTime!;
  }

  globalThis._setStaticTerrainData = (
    buffer: ArrayBufferLike,
    roomOffsets: RoomOffsets,
  ): void => {
    for (const room in roomOffsets) {
      staticTerrainData[room] = new Uint8Array(buffer, roomOffsets[room], 2500);
    }
  }

  globalThis._evalFn = (fnString: string): void => {
    eval("(" + fnString + ")(scope)");
  }

  globalThis._start = (data: IntentData): void => {
    globalThis.startDirtyTime = globalThis.nowCpuTime();
    const intentCpu = 0.2,
      freeMethods: { [name: string]: boolean } = { say: true, pull: true };

    globalThis.intents = {
      list: {} as {
        [id: string]: IntentList | IntentMap;
      },
      cpu: 0,
      set(id: string, name: string, data: IntentData): void {
        this.list[id] = (this.list[id] as IntentMap) || {};
        if (!freeMethods[name] && !(this.list[id] as IntentMap)[name]) {
          this.cpu += intentCpu;
        }
        (this.list[id] as IntentMap)[name] = data;
      },
      push(name: string, data: IntentData, maxLen: number): boolean {
        this.list[name] = (this.list[name] as []) || [];
        if (maxLen && Object.keys(this.list[name]).length >= maxLen) {
          return false;
        }
        (this.list[name] as unknown as IntentList).push(data);
        this.cpu += intentCpu;
        return true;
      },
      pushByName(
        id: string,
        name: string,
        data: IntentData,
        maxLen: number,
      ): boolean {
        const intentMap: IntentMap = (this.list[id] =
          this.list[id] || {}) as IntentMap;
        intentMap[name] = intentMap[name] || [];
        if (maxLen && Object.keys(intentMap[name]).length >= maxLen) {
          return false;
        }
        (this.list[id] as IntentMap)[name] = data;
        this.cpu += intentCpu;
        return true;
      },
      remove(id: string, name: string): boolean {
        if (this.list[id] && (this.list[id] as IntentMap)[name]) {
          delete (this.list[id] as IntentMap)[name];
          return true;
        }
        return false;
      },
    };

    globalThis.rawMemory = Object.create(null, {
      get: {
        value: function () {
          return (data.userMemory as UserMemory).data;
        },
      },
      set: {
        value: function (value: string): void {
          if (!_.isString(value)) {
            throw new Error("Raw memory value is not a string");
          }
          if (value.length > 2 * 1024 * 1024) {
            throw new Error("Raw memory length exceeded 2 MB limit");
          }
          if (this._parsed) {
            delete this._parsed;
          }
          (data.userMemory as UserMemory).data = value;
        },
      },
      segments: {
        value: Object.create(null),
      },
      interShardSegment: {
        value: "",
        writable: true,
      },
      setActiveSegments: {
        value: function (ids: Array<string>): void {
          if (!_.isArray(ids)) {
            throw new Error(`"${ids}" is not an array`);
          }
          if (ids.length > 10) {
            throw new Error(
              "Only 10 memory segments can be active at the same time",
            );
          }
          globalThis.activeSegments = [];
          for (let i = 0; i < ids.length; i++) {
            const id = parseInt(ids[i]);
            if (_.isNaN(id) || id > 99 || id < 0) {
              throw new Error(`"${ids[i]}" is not a valid segment ID`);
            }
            globalThis.activeSegments.push(id);
          }
        },
      },
      setPublicSegments: {
        value: function (ids: Array<string>): void {
          if (!_.isArray(ids)) {
            throw new Error(`"${ids}" is not an array`);
          }
          globalThis.publicSegments = [];
          for (let i = 0; i < ids.length; i++) {
            const id = parseInt(ids[i]);
            if (_.isNaN(id) || id > 99 || id < 0) {
              throw new Error(`"${ids[i]}" is not a valid segment ID`);
            }
            globalThis.publicSegments.push(id);
          }
        },
      },
      setDefaultPublicSegment: {
        value: function (id: string | number): void {
          if (id !== null) {
            if (typeof id === "string") {
              id = parseInt(id);
            }
            if (_.isNaN(id) || id > 99 || id < 0) {
              throw new Error(`"${id}" is not a valid segment ID`);
            }
          }
          globalThis.defaultPublicSegment = id;
        },
      },
      setActiveForeignSegment: {
        value: function (username: string, id: string | number): void {
          if (username === null) {
            globalThis.activeForeignSegment = undefined;
            return;
          }
          if (id !== undefined) {
            if (typeof id === "string") {
              id = parseInt(id);
            }
            if (_.isNaN(id) || id > 99 || id < 0) {
              throw new Error(`"${id}" is not a valid segment ID`);
            }
          }
          globalThis.activeForeignSegment = { username, id };
        },
      },
    });
    if (data.memorySegments) {
      for (const i in data.memorySegments) {
        globalThis.rawMemory.segments[i] = data.memorySegments[i];
      }
    }

    if (data.foreignMemorySegment) {
      globalThis.rawMemory.foreignSegment = Object.create(null);
      Object.assign(globalThis.rawMemory.foreignSegment, data.foreignMemorySegment);
    }

    return new globalThis.ivm.Reference((): void => {
      globalThis.startTime = globalThis.nowCpuTime();

      try {
        globalThis.outMessage.type = "done";
      } catch (e: unknown) {
        globalThis.outMessage.type = "error";
        // @ts-ignore
        this.outMessage.error = e.stack || e.toString();
      }

      if (globalThis.rawMemory._parsed) {
        data.userMemory.data = JSON.stringify(globalThis.rawMemory._parsed);
      }

      globalThis.segmentKeys = Object.keys(globalThis.rawMemory.segments);
      if (globalThis.segmentKeys.length > 0) {
        if (globalThis.segmentKeys.length > 10) {
          throw "Cannot save more than 10 memory segments on the same tick";
        }
        globalThis.outMessage.memorySegments = {};
        for (let i = 0; i < globalThis.segmentKeys.length; i++) {
          const key = parseInt(globalThis.segmentKeys[i]);
          if (_.isNaN(key) || key < 0 || key > 99) {
            throw `"${globalThis.segmentKeys[i]}" is not a valid memory segment ID`;
          }
          if (
            typeof globalThis.rawMemory.segments[parseInt(globalThis.segmentKeys[i])] !=
            "string"
          ) {
            throw `Memory segment #${globalThis.segmentKeys[i]} is not a string`;
          }
          if (
            globalThis.rawMemory.segments[parseInt(globalThis.segmentKeys[i])].length >
            100 * 1024
          ) {
            throw `Memory segment #${globalThis.segmentKeys[i]} has exceeded 100 KB length limit`;
          }
          globalThis.outMessage.memorySegments[key] =
            "" + globalThis.rawMemory.segments[parseInt(globalThis.segmentKeys[i])];
        }
      }

      globalThis.outMessage.usedTime = Math.ceil(
        globalThis.nowCpuTime() - globalThis.startTime + globalThis.intents.cpu,
      );
      globalThis.outMessage.usedDirtyTime = Math.ceil(
        globalThis.nowCpuTime() - globalThis.startDirtyTime!,
      );
      globalThis.outMessage.intentsCpu = globalThis.intents.cpu;
      globalThis.outMessage.memory = data.userMemory;

      globalThis.outMessage.activeSegments = globalThis.activeSegments;
      globalThis.outMessage.activeForeignSegment = globalThis.activeForeignSegment;
      globalThis.outMessage.defaultPublicSegment = globalThis.defaultPublicSegment;
      if (globalThis.publicSegments) {
        globalThis.outMessage.publicSegments = globalThis.publicSegments.join(",");
      }

      return new globalThis.ivm.ExternalCopy(globalThis.outMessage).copyInto();
    });
  }
}
