export const supportMethod = ["get", "post", "delete", "put", "option"] as const
export type HandlerFn = (data: Map<string, string>, request: Request, url: URL) => Response | Promise<Response>;
export type HandlerGroup = {
  url: string;
  handler: HandlerFn;
  method: typeof supportMethod[number]
}
export type HandlerRecord = HandlerGroup[]
export type JSTypes = "string" | "number" | "boolean" | "undefined" | "object" | "bigint" | "symbol"

export type MiddlewareContext = {
  request: Request;
  urlParse: URL;
  paramMap: Map<string, string>;
}

export type Middleware = (context: MiddlewareContext, next: () => Promise<Response>) => Response | Promise<Response>;
export interface SearchResult {
  mod: Date;
  data: {
    name: string;
    description: string;
    version: string;
    scope: string;
    download: number;
  }[]
}
export type MiddlewareWithPaths = {
  paths: string[];
  middleware: Middleware;
}
export interface FindUserParams {
  id?: number;
  name?: string;
  mail?: string;
}
export interface User {
  uid: number;
  name: string;
  mail: string;
  ctime: string;
  friends: number[];
  friends_request: number[];
  password: string;
  avatar_url?: string;
}
export type UpdateUserParams = Partial<User>;
export interface Version {
  name: string;
  create_user: number;
  readme: number;
  version_tag: string;
  create_time: Date;
}

export interface MNXPackageData {
  id: number;
  created_at: Date;
  update_at: Date;
  versions: Version[];
  name: string;
  create_user: number;
  scope: string;
  point: string;
  download: number; /**下载量 */
}
export interface MNXReadme {
  id: number,
  content: string;
  cout: number;
}
export interface MNXScope {
  id: number;
  user: number;
  name: string;
  created_at: Date
}
export interface MNXPublishToken {
  id: number;
  created_at: Date;
  user: number;
  name: string;
  token: string;
  scope: string[]
  permission: number;
  time: number;
}

export interface FindTokenParam {
  id?: string;
  content?: string;
}

export interface UpdateTokenParams extends Partial<MNXPublishToken> { }
export interface MNXPackageInfoResult {
  id: string;
  readmeTable: [number, string][];
  versions: {
    download_url: string,
    version_tag: string;
    name: string;
    create_user: User;
    readme: number;
    create_time: string; // ISO Date string
  }[];
  download: number; /**下载量 */
}
export interface BaseResult {
  code: 200 | -1,
  message: string;
  success: boolean;
}
export interface MNXPackageVersionInfoResult {
  id: string;
  versions: {
    download_url: string,
    version_tag: string;
    name: string;
    create_user: User;
    readme: string;
    create_time: string; // ISO Date string
  }
}
export interface PublishMetadata {
  readme: string;
  scope: string;
  name: string;
  version: string;
  version_tag: string;
}
export interface UserScopeResult extends BaseResult {
  data: {
    scope: string;
  }
}
export interface ListPackageResult extends BaseResult {
  data: {
    downloaded: number;
    id: string;
  }[];
}