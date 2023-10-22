import { JSONFrameStream } from "@/Rpc/JSONFrameStream";

test("JSONFrameStream", () => {
  const buffer = JSONFrameStream.makeFrame({ Loki: "god" });
  console.log(buffer);
  expect(buffer.length).toBe(18);
});
