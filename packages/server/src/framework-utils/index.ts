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
export async function verifyTurnstileToken(
  token: string,
  secretKey: string = env.Turnstile_KEY,
  options: {
    remoteip?: string
    sitekey?: string
  } = {
      sitekey: env.Turnstile_SITE_KEY
    }
): Promise<TurnstileResponse> {
  // Cloudflare Turnstile 验证端点
  const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', token)

  if (options?.remoteip) {
    formData.append('remoteip', options.remoteip)
  }

  if (options?.sitekey) {
    formData.append('sitekey', options.sitekey)
  }

  const response = await fetch(TURNSTILE_URL, {
    method: 'POST',
    body: formData,
    headers: {
      // 添加 Cloudflare Worker 标识
      'User-Agent': 'Cloudflare-Workers-Turnstile-Verification/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Turnstile API error: ${response.status}`)
  }

  return await response.json() as TurnstileResponse
}
interface TurnstileResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
}