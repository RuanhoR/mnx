export type MiddlewareContext = {
  request: Request;
  urlParse: URL;
  paramMap: Map<string, string>;
};

export type Middleware = (context: MiddlewareContext, next: () => Promise<Response>) => Response | Promise<Response>;

export type MiddlewareWithPaths = {
  paths: string[];
  middleware: Middleware;
};

export const supportMethod: readonly ['get', 'post', 'delete', 'put', 'option'];
export type SupportMethod = (typeof supportMethod)[number];

export type HandlerFn = (data: Map<string, string>, request: Request, url: URL) => Response | Promise<Response>;

export type HandlerGroup = {
  url: string;
  handler: HandlerFn;
  method: SupportMethod;
};

export type HandlerRecord = HandlerGroup[];

interface QueryResult<T = any> {
  data: T[] | null;
  error: any;
}

interface PostgrestFilterBuilder<T = any> extends PromiseLike<QueryResult<T>> {
  eq(column: string, value: any): this;
  neq(column: string, value: any): this;
  gt(column: string, value: any): this;
  lt(column: string, value: any): this;
  gte(column: string, value: any): this;
  lte(column: string, value: any): this;
  like(column: string, pattern: string): this;
  ilike(column: string, pattern: string): this;
  is(column: string, value: any): this;
  in(column: string, values: any[]): this;
  or(filters: string): this;
  limit(count: number): this;
  select(columns?: string): PostgrestFilterBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): this;
}

interface PostgrestQueryBuilder<T = any> {
  select(columns?: string): PostgrestFilterBuilder<T>;
  insert(values: any, options?: any): PostgrestFilterBuilder<T>;
  update(values: any, options?: any): PostgrestFilterBuilder<T>;
  delete(options?: any): PostgrestFilterBuilder<T>;
}

export class KV {
  static get(key: string): Promise<string | null>;
  static put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  static delete(key: string): Promise<void>;
}

export class DB {
  static get users(): PostgrestQueryBuilder;
  static get packages(): PostgrestQueryBuilder;
  static get scopes(): PostgrestQueryBuilder;
  static get readmes(): PostgrestQueryBuilder;
  static get publishTokens(): PostgrestQueryBuilder;
}

export class Storage {
  static upload(path: string, file: File | Blob | ArrayBuffer | ReadableStream): Promise<any>;
  static remove(paths: string[]): Promise<any>;
  static createSignedUrl(path: string, expiresIn?: number): Promise<{ data?: { signedUrl: string }; error?: any }>;
  static download(path: string): Promise<{ data?: Blob; error?: any }>;
  static createReadableStream(path: string): Promise<{ stream: ReadableStream; size?: number } | { error: string }>;
}

export const config: {
  readonly passworditeration: number;
  readonly host: string;
  readonly allowCors: string;
  readonly accountApiHost: string;
};

export function json(obj: object, status?: number): Response;

type TypeMap = {
  string: string; number: number; boolean: boolean; object: object;
  function: Function; symbol: symbol; undefined: undefined; bigint: bigint
};

export function verifyType<T extends Record<string, keyof TypeMap>>(
  obj: any, verify: T
): obj is { [K in keyof T]: TypeMap[T[K]] };

export function parseArrayToString(data: string[]): string;
export function parseStringToArray(str: string): string[];

declare class ResponseFrame {
  constructor(request: Request);
  handlerRequest(): Promise<Response>;
  get(url: string, handler: HandlerFn): void;
  post(url: string, handler: HandlerFn): void;
  put(url: string, handler: HandlerFn): void;
  delete(url: string, handler: HandlerFn): void;
  use(middleware: Middleware): void;
  use(path: string, middleware: Middleware): void;
  use(paths: string[], middleware: Middleware): void;
}

export default ResponseFrame;
