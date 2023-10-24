import IsolatedVM from "isolated-vm";
import * as v8 from "v8";
import fs from "fs";
import { Metric, NodeJS, StaticTerrainData, VM } from "@/runtime/types";
import RuntimeGlobal = NodeJS.RuntimeGlobal;
import { Common } from "@neo-screeps/common";

const common = new Common();

export class UserVM {
  public vms: { [userId: string]: VM } = {};
  public config = common.configManager.config;
  public snapshot?: NonNullable<unknown>;
  public async create(
    userId: string,
    staticTerrainData: StaticTerrainData,
    staticTerrainDataSize: number,
    codeTimestamp: number,
  ): Promise<void> {
    if (this.vms[userId]) {
      if (this.vms[userId].isolate.isDisposed) {
        exports.clear(userId);
        throw "Script execution has been terminated: your isolate disposed unexpectedly, restarting virtual machine";
      }
      if (!this.vms[userId].ready) {
        return this.vms[userId].promise;
      } else if (codeTimestamp > this.vms[userId].codeTimestamp) {
        exports.clear(userId);
      }
    }

    if (!this.vms[userId]) {
      const inspector = this.config.engine.enableInspector;
      const isolate = new IsolatedVM.Isolate({
        memoryLimit: 256 + staticTerrainDataSize / 1024 / 1024,
      });

      const vm: VM = (this.vms[userId] = {
        isolate,
        ready: false,
        codeTimestamp,
        lastUsed: Date.now(),
      });
      const promise = async (): Promise<void> => {
        const context = await isolate.createContext({ inspector });
        if (!this.snapshot) {
          await (
            await isolate.compileScript(
              fs.readFileSync(require.resolve("../../dist/runtime.js"), "utf8"),
            )
          ).run(context);
        }
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        declare const global: RuntimeGlobal;
        const [initScript, cleanupScript] = await Promise.all([
          isolate.compileScript("_init();"),
          isolate.compileScript(
            `new ${function (): void {
              delete global._ivm;
              delete global._isolate;
              delete global._context;
              delete global._init;
              delete global._evalFn;
              delete global._start;
              delete global._setStaticTerrainData;
            }}`,
          ),
        ]);

        context.global.setIgnored("global", context.global.derefInto());
        context.global.setIgnored("_ivm", IsolatedVM);
        context.global.setIgnored("_isolate", isolate);
        context.global.setIgnored("_context", context);
        context.global.setIgnored(
          "_halt",
          new IsolatedVM.Reference(function () {
            vm.didHaltByUserRequest = true;
            isolate.dispose();
          }),
        );
        await initScript.run(context);

        const [evalFn, start, setStaticTerrainData] = await Promise.all([
          context.global.get("_evalFn"),
          context.global.get("_start"),
          context.global.get("_setStaticTerrainData"),
        ]);

        await Promise.all([
          setStaticTerrainData.apply(undefined, [
            new IsolatedVM.ExternalCopy(staticTerrainData.buffer).copyInto({
              release: true,
            }),
            new IsolatedVM.ExternalCopy(staticTerrainData.roomOffsets).copyInto(
              { release: true },
            ),
          ]),
          cleanupScript.run(context),
        ]);

        Object.assign(this.vms[userId], {
          ready: true,
          context,
          start,
          evalFn,
          codeTimestamp,
        });
      };
      vm.promise = promise();
      await vm.promise;
    }

    this.vms[userId].lastUsed = Date.now();
  }
  public get(userId: string): VM | undefined {
    if (this.vms[userId] && this.vms[userId].ready) {
      return this.vms[userId];
    }
  }
  public clear(userId: string): void {
    if (this.vms[userId]) {
      try {
        if (!this.vms[userId].isolate.isDisposed) {
          this.vms[userId].isolate.dispose();
        }
      } catch (e) {
        console.error("release isolate error", userId, e);
      }
      delete this.vms[userId];
    }
  }
  public clearAll(): void {
    for (const userId in this.vms) {
      this.clear(userId);
    }
  }
  public getMetrics(): Metric[] {
    return Object.keys(this.vms).reduce((accum: Metric[], userId: string) => {
      if (this.vms[userId]) {
        const result = {
          userId,
          codeTimestamp: this.vms[userId].codeTimestamp,
          lastUsed: this.vms[userId].lastUsed,
          heap: {},
        };
        if (!this.vms[userId].isolate.isDisposed) {
          result.heap = this.vms[userId].isolate.getHeapStatisticsSync();
        }
        accum.push(<Metric>result);
      }
      return accum;
    }, []);
  }
  public init(): void {
    setInterval((): void => {
      for (const userId in this.vms) {
        if (
          this.vms[userId] &&
          this.vms[userId].lastUsed < Date.now() - 3 * 60 * 1000
        ) {
          this.clear(userId);
        }
      }
    }, 60 * 1000);

    if (this.config.engine.reportMemoryUsageInterval) {
      setInterval(() => {
        console.log("---");
        const heap = v8.getHeapStatistics();
        console.log(`# Main heap: ${heap.total_heap_size}`);
        console.log(
          `# ExternalCopy.totalExternalSize: ${IsolatedVM.ExternalCopy.totalExternalSize}`,
        );

        this.getMetrics().forEach((user: Metric) => {
          console.log(
            `# User ${user.userId} heap: ${
              user.heap.total_heap_size + user.heap.externally_allocated_size
            }`,
          );
        });
        console.log("---");
      }, this.config.engine.reportMemoryUsageInterval);
    }
  }
}
