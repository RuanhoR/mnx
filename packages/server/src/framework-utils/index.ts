import { env } from "cloudflare:workers";
import { JSTypes } from "../types";

export function json(json: object, status?: number) {
  return new Response(JSON.stringify(json), {
    headers: {
      "Content-type": "application/json; charset=utf-8"
    },
    status: status || 200
  })
}
export type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  object: object;
  function: Function;
  symbol: symbol;
  undefined: undefined;
  bigint: bigint;
};

// 泛型版本，提供更好的类型推断
export function verifyType<T extends Record<string, keyof TypeMap>>(
  obj: any,
  verify: T
): obj is { [K in keyof T]: TypeMap[T[K]] } {
  return Object.entries(verify).every(([key, type]) => {
    return typeof obj[key] === type;
  });
}
export function parseArrayToString(data: string[]): string {
  return data.map(i => {
    if (i.includes(String.fromCharCode(0))) throw new Error("[parse]: have \\u0000")
    return i;  // 添加返回值
  }).join(String.fromCharCode(0))
}
export function parseStringToArray(str: string): string[] {
  return str.split(String.fromCharCode(0))
}