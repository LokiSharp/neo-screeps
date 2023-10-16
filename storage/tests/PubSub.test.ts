import { PubSub } from "@/PubSub";

const logSpy = jest.spyOn(console, "log");
describe("PubSub", () => {
  test("PubSub", () => {
    const pubSub = new PubSub();
    const ps1 = pubSub.create();
    const ps2 = pubSub.create();
    ps1.methods.subscribe("ps1", (data) => {
      console.log(data.data);
    });
    ps2.methods.subscribe("ps2", (data) => {
      console.log(data.data);
    });
    ps1.methods.publish("ps1", "This is ps1");
    expect(logSpy).toHaveBeenCalledWith("This is ps1");
    ps2.methods.publish("ps2", "This is ps2");
    expect(logSpy).toHaveBeenCalledWith("This is ps2");
    ps1.methods.publish("ps1", "This is ps1");
    expect(logSpy).toHaveBeenCalledWith("This is ps1");
    ps1.close();
    ps2.close();
    ps1.methods.publish("ps1", "This is ps1");
    expect(logSpy).toBeCalledTimes(3);
    ps2.methods.publish("ps2", "This is ps2");
    expect(logSpy).toBeCalledTimes(3);
  });
});
