import { helloWorld } from "@/main";

test("Hello, World!", () => {
  const logSpy = jest.spyOn(console, "log");
  helloWorld();
  expect(logSpy).toHaveBeenCalledWith("Hello, World!");
});
