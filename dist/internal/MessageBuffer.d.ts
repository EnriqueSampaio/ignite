/// <reference types="node" />
export declare class MessageBuffer {
    private _buffer;
    private _capacity;
    private _length;
    private _position;
    constructor(capacity?: number);
    static from(source: any, position: any): MessageBuffer;
    copy(): MessageBuffer;
    concat(source: any): void;
    get position(): number;
    set position(position: number);
    get length(): number;
    get data(): Buffer;
    get buffer(): Buffer;
    getSlice(start: any, end: any): Buffer;
    writeByte(value: any): void;
    writeShort(value: any): void;
    writeInteger(value: any): void;
    writeLong(value: any): void;
    writeFloat(value: any): void;
    writeDouble(value: any): void;
    writeNumber(value: any, type: any, signed?: boolean): void;
    writeBoolean(value: any): void;
    writeChar(value: any): void;
    writeString(value: any): void;
    writeDate(value: any): void;
    readByte(): any;
    readShort(): any;
    readInteger(): any;
    readLong(): any;
    readFloat(): any;
    readDouble(): any;
    readNumber(type: any, signed?: boolean): any;
    readBoolean(): boolean;
    readChar(): string;
    readString(): string;
    readBuffer(length: any): Buffer;
    readDate(): Date;
    writeBuffer(buffer: any, start?: any, end?: any): void;
    _ensureSize(size: any): void;
    _ensureCapacity(valueSize: any): void;
}
