import { Writable, WritableOptions } from "stream";

export class JSONFrameStream extends Writable {
  public handler: (obj: object) => void;
  public frame: Frame | null;

  public constructor(
    handler: (obj: object) => void,
    options?: WritableOptions,
  ) {
    super(options);
    this.handler = handler;
    this.frame = null;
  }

  public _write(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this._parse(chunk);
    callback();
  }

  public _parse(buffer: Buffer): unknown | undefined {
    if (!buffer.length) {
      return;
    }
    if (!this.frame) {
      this.frame = {
        data: Buffer.alloc(4),
        pointer: 0,
      };
    }
    if (!this.frame.size) {
      const length = Math.min(buffer.length, 4 - this.frame.pointer);
      buffer.copy(this.frame.data, this.frame.pointer, 0, length);
      this.frame.pointer += length;
      if (this.frame.pointer === 4) {
        this.frame.size = this.frame.data.readUInt32BE();
        this.frame.data = Buffer.alloc(this.frame.size);
        this.frame.pointer = 0;
      }
      return this._parse(buffer.slice(length));
    } else {
      const length = Math.min(
        buffer.length,
        this.frame.size - this.frame.pointer,
      );
      buffer.copy(this.frame.data, this.frame.pointer, 0, length);
      this.frame.pointer += length;
      if (this.frame.pointer == this.frame.size) {
        this.handler(JSON.parse(this.frame.data.toString("utf8")));
        this.frame = null;
      }
      return this._parse(buffer.slice(length));
    }
  }

  public static makeFrame(obj: object): Buffer {
    const data = Buffer.from(JSON.stringify(obj), "utf8");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    return Buffer.concat([length, data]);
  }
}
