import { UserVM } from "@/runtime/UserVM";
import { StaticTerrainData } from "@/runtime/types";

const terrainData: StaticTerrainData = <StaticTerrainData>{};
test("UserVM create, get and clear", async () => {
  const userVM = new UserVM();
  await userVM.create("1", terrainData, 0, 0);
  expect(Object.keys(userVM.vms).length).toBe(1);
  expect(userVM.get("1")).not.toBe(undefined);
  await userVM.create("2", terrainData, 0, 0);
  expect(Object.keys(userVM.vms).length).toBe(2);
  await userVM.create("3", terrainData, 0, 0);
  expect(Object.keys(userVM.vms).length).toBe(3);
  userVM.clear("1");
  expect(Object.keys(userVM.vms).length).toBe(2);
  expect(userVM.get("1")).toBe(undefined);
  userVM.clearAll();
  expect(Object.keys(userVM.vms).length).toBe(0);
});

test("UserVM getMetrics", () => {
  const userVM = new UserVM();
  userVM.create("1", terrainData, 0, 0);
  expect(Object.keys(userVM.vms).length).toBe(1);
  expect(userVM.getMetrics()).not.toBe(undefined);
});

test("UserVM init", () => {
  const logSpy = jest.spyOn(console, "log");
  jest.useFakeTimers();
  const userVM = new UserVM();
  userVM.create("1", terrainData, 0, 0);
  userVM.create("2", terrainData, 0, 0);
  userVM.create("3", terrainData, 0, 0);
  userVM.create("4", terrainData, 0, 0);
  userVM.config.engine.reportMemoryUsageInterval = 1000;
  userVM.init();
  jest.advanceTimersByTime(1000);
  expect(logSpy).toBeCalled();
});
