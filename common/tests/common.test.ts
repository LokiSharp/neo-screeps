import { Common } from "@/index";

test("findPort", async () => {
  const common = new Common();
  const defer = common.findPort(8080);
  await defer.defer;
});

test("decodeTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  console.log(terrainString);
});

test("encodeTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  const result = common.decodeTerrain(terrainString, "testRoom");
  expect(result[0].type).toBe(terrain[0].type);
});

test("checkTerrain", async () => {
  const common = new Common();
  const terrain = [{ type: "wall", x: 0, y: 0 }];
  const terrainString = common.encodeTerrain(terrain);
  const result = common.checkTerrain(terrainString, 0, 0, 1);
  expect(result).toBe(true);
});
