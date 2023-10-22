import { ConfigManager } from "@/ConfigManager";
export { RpcServer } from "@/Rpc/RpcServer";
export { RpcClient } from "@/Rpc/RpcClient";

export const common = {
  configManager: new ConfigManager(),
};
