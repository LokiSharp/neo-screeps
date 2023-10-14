/* eslint-disable  */
// @ts-ignore
import { init } from "@/runtime/Runtime";

// @ts-ignore
globalThis._init = init;

// @ts-ignore
function bufferFromBase64(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}
