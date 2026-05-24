import { createClient as createRedis } from 'redis'
import { Pool } from 'pg'
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { writeFile, readFile } from 'fs/promises'

const REDIS_URL = process.env.REDIS_SERVER || 'redis://localhost:6379'
const PG_URL = process.env.POSTGRESQL_SERVER || 'postgresql://localhost:5432/pmnx'
const STORAGE_PATH = process.env.STORAGE_PATH || join(process.cwd(), 'data', 'storage')

let redisClient: ReturnType<typeof createRedis> | null = null
async function getRedis() {
  if (!redisClient) {
    redisClient = createRedis({ url: REDIS_URL })
    await redisClient.connect()
  }
  return redisClient
}

let pgPool: Pool | null = null
function getPool() {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: PG_URL })
  }
  return pgPool
}

function ensureStorageDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return val.toString()
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (val instanceof Date) return `'${val.toISOString()}'`
  return `'${String(val).replace(/'/g, "''")}'`
}

class PostgrestBuilder {
  private filters: string[] = []
  private limitCount: number | null = null
  private orderClause: string | null = null
  private selectCols = '*'
  private insertData: any = null
  private updateData: any = null
  private isDelete = false
  private returnSelect = false

  constructor(private table: string) {}

  select(columns?: string) {
    if (columns) this.selectCols = columns
    this.returnSelect = true
    return this
  }

  insert(values: any) { this.insertData = values; return this }
  update(values: any) { this.updateData = values; return this }
  delete() { this.isDelete = true; return this }

  eq(col: string, val: any) { this.filters.push(`${col} = ${escapeSql(val)}`); return this }
  neq(col: string, val: any) { this.filters.push(`${col} != ${escapeSql(val)}`); return this }
  gt(col: string, val: any) { this.filters.push(`${col} > ${escapeSql(val)}`); return this }
  lt(col: string, val: any) { this.filters.push(`${col} < ${escapeSql(val)}`); return this }
  gte(col: string, val: any) { this.filters.push(`${col} >= ${escapeSql(val)}`); return this }
  lte(col: string, val: any) { this.filters.push(`${col} <= ${escapeSql(val)}`); return this }
  like(col: string, pat: string) { this.filters.push(`${col} LIKE ${escapeSql(pat)}`); return this }
  ilike(col: string, pat: string) { this.filters.push(`${col} ILIKE ${escapeSql(pat)}`); return this }
  is(col: string, val: any) { this.filters.push(`${col} IS ${escapeSql(val)}`); return this }
  in(col: string, vals: any[]) { this.filters.push(`${col} IN (${vals.map(v => escapeSql(v)).join(',')})`); return this }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderClause = `${col} ${opts?.ascending === false ? 'DESC' : 'ASC'}`
    return this
  }

  or(filters: string) {
    const parts = filters.split(',')
    const conditions = parts.map(p => {
      const dotIdx = p.indexOf('.')
      if (dotIdx === -1) return p
      const col = p.substring(0, dotIdx)
      const rest = p.substring(dotIdx + 1)
      const opDot = rest.indexOf('.')
      if (opDot === -1) return p
      const op = rest.substring(0, opDot)
      const val = rest.substring(opDot + 1)
      if (op === 'ilike') return `${col} ILIKE ${escapeSql(val)}`
      if (op === 'like') return `${col} LIKE ${escapeSql(val)}`
      if (op === 'eq') return `${col} = ${escapeSql(val)}`
      return p
    })
    this.filters.push(`(${conditions.join(' OR ')})`)
    return this
  }

  limit(n: number) { this.limitCount = n; return this }

  private async execute(): Promise<{ data: any[] | null; error: any }> {
    const pool = getPool()
    try {
      let sql: string
      const params: any[] = []

      if (this.insertData) {
        const keys = Object.keys(this.insertData)
        sql = `INSERT INTO ${this.table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`
        if (this.returnSelect) sql += ' RETURNING *'
        const res = await pool.query(sql, keys.map(k => this.insertData[k]))
        return { data: res.rows, error: null }
      }

      if (this.updateData) {
        const keys = Object.keys(this.updateData)
        sql = `UPDATE ${this.table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(',')}`
        if (this.filters.length > 0) {
          sql += ' WHERE ' + this.filters.join(' AND ')
        }
        if (this.returnSelect) sql += ' RETURNING *'
        const res = await pool.query(sql, keys.map(k => this.updateData[k]))
        return { data: res.rows, error: null }
      }

      if (this.isDelete) {
        sql = `DELETE FROM ${this.table}`
        if (this.filters.length > 0) sql += ' WHERE ' + this.filters.join(' AND ')
        if (this.returnSelect) sql += ' RETURNING *'
        const res = await pool.query(sql)
        return { data: res.rows, error: null }
      }

      sql = `SELECT ${this.selectCols} FROM ${this.table}`
      if (this.filters.length > 0) sql += ' WHERE ' + this.filters.join(' AND ')
      if (this.orderClause) sql += ' ORDER BY ' + this.orderClause
      if (this.limitCount !== null) sql += ` LIMIT ${this.limitCount}`
      const res = await pool.query(sql)
      return { data: res.rows, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any[] | null; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled!, onrejected!)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<{ data: any[] | null; error: any } | TResult> {
    return this.execute().catch(onrejected!)
  }
}

export class KV {
  static async get(key: string): Promise<string | null> {
    return (await getRedis()).get(key)
  }
  static async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const r = await getRedis()
    if (options?.expirationTtl) await r.setEx(key, options.expirationTtl, value)
    else await r.set(key, value)
  }
  static async delete(key: string): Promise<void> {
    await (await getRedis()).del(key)
  }
}

export class DB {
  static get users() { return new PostgrestBuilder('user_table') }
  static get packages() { return new PostgrestBuilder('mnx_packages') }
  static get scopes() { return new PostgrestBuilder('mnx_scope') }
  static get readmes() { return new PostgrestBuilder('mnx_readme') }
  static get publishTokens() { return new PostgrestBuilder('publish-token') }
}

interface StorageResult { data?: any; error?: { message: string } }

export class Storage {
  private static storagePath(path: string) { return join(STORAGE_PATH, 'mnx', path) }

  static async upload(path: string, file: File | Blob | ArrayBuffer | ReadableStream): Promise<StorageResult> {
    const full = this.storagePath(path)
    ensureStorageDir(dirname(full))
    try {
      if (file instanceof ReadableStream) {
        await file.pipeTo(createWriteStream(full) as any)
      } else {
        const buf = file instanceof ArrayBuffer ? Buffer.from(file) : Buffer.from(await (file as Blob).arrayBuffer())
        await writeFile(full, buf)
      }
      return { data: { path: full } }
    } catch (err) { return { error: { message: err instanceof Error ? err.message : String(err) } } }
  }

  static async remove(paths: string[]): Promise<StorageResult> {
    try {
      for (const p of paths) { const f = this.storagePath(p); if (existsSync(f)) unlinkSync(f) }
      return { data: {} }
    } catch (err) { return { error: { message: err instanceof Error ? err.message : String(err) } } }
  }

  static async createSignedUrl(path: string, _expiresIn = 60): Promise<{ data?: { signedUrl: string }; error?: { message: string } }> {
    const full = this.storagePath(path)
    if (!existsSync(full)) return { error: { message: 'File not found' } }
    return { data: { signedUrl: `file://${full}` } }
  }

  static async download(path: string): Promise<{ data?: Blob; error?: { message: string } }> {
    const full = this.storagePath(path)
    try {
      if (!existsSync(full)) return { error: { message: 'File not found' } }
      return { data: new Blob([await readFile(full)]) }
    } catch (err) { return { error: { message: err instanceof Error ? err.message : String(err) } } }
  }

  static async createReadableStream(path: string): Promise<{ stream: ReadableStream; size?: number } | { error: string }> {
    const full = this.storagePath(path)
    try {
      if (!existsSync(full)) return { error: 'File not found' }
      const st = statSync(full)
      const nodeStream = createReadStream(full)
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
          nodeStream.on('end', () => controller.close())
          nodeStream.on('error', (err) => controller.error(err))
        }
      })
      return { stream: webStream, size: st.size }
    } catch (err) { return { error: err instanceof Error ? err.message : 'Read failed' } }
  }
}

export function json(obj: object, status?: number): Response {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    status: status || 200
  })
}

type TypeMap = {
  string: string; number: number; boolean: boolean; object: object;
  function: Function; symbol: symbol; undefined: undefined; bigint: bigint
}

export function verifyType<T extends Record<string, keyof TypeMap>>(
  obj: any, verify: T
): obj is { [K in keyof T]: TypeMap[T[K]] } {
  return Object.entries(verify).every(([key, type]) => typeof obj[key] === type)
}

export function parseArrayToString(data: string[]): string {
  return data.map(i => {
    if (i.includes(String.fromCharCode(0))) throw new Error('[parse]: have \\u0000')
    return i
  }).join(String.fromCharCode(0))
}

export function parseStringToArray(str: string): string[] {
  return str.split(String.fromCharCode(0))
}

export const config = {
  passworditeration: parseInt(process.env.PASSWORD_ITERATIONS || '2000', 10),
  host: process.env.HOST || 'http://localhost:3000',
  allowCors: process.env.ALLOW_CORS || 'localhost',
  accountApiHost: process.env.ACCOUNT_API_HOST || 'https://a.p.z.ruanhor.dpdns.org'
}

type MiddlewareFn = (context: MiddlewareContext, next: () => Promise<Response>) => Response | Promise<Response>
type MiddlewareDef = MiddlewareFn | { paths: string[]; middleware: MiddlewareFn }
type HandlerDef = { url: string; handler: HandlerFn; method: string }
type MiddlewareContext = { request: Request; urlParse: URL; paramMap: Map<string, string> }
type HandlerFn = (data: Map<string, string>, request: Request, url: URL) => Response | Promise<Response>

class ResponseFrame {
  private urlParse: URL
  private handlers: HandlerDef[] = []
  private middlewares: MiddlewareDef[] = []
  private urlRoute: string[]
  private methodIndex: Map<string, HandlerDef[]> = new Map()

  constructor(private request: Request) {
    this.urlParse = new URL(request.url)
    this.urlRoute = this.urlParse.pathname.split('/').filter(s => s !== '')
  }

  async handlerRequest(): Promise<Response> {
    try {
      const method = this.request.method.toLowerCase()
      if (method === 'options') {
        const origin = this.request.headers.get('Origin')
        let allowed = 'https://' + config.allowCors
        if (origin) {
          try {
            const u = new URL(origin)
            if (u.hostname === config.allowCors || u.hostname.endsWith('.' + config.allowCors))
              allowed = origin
          } catch {}
        }
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': allowed,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true'
          }
        })
      }

      let matchedHandler: HandlerDef | undefined
      let paramMap = new Map<string, string>()
      const methodHandlers = this.methodIndex.get(method)
      if (methodHandlers) {
        const sameLen = methodHandlers.filter(h => {
          const segs = h.url.split('/').filter(s => s !== '')
          return segs.length === this.urlRoute.length
        })
        for (const h of sameLen) {
          const segs = h.url.split('/').filter(s => s !== '')
          paramMap.clear()
          let match = true
          for (let i = 0; i < segs.length; i++) {
            if (segs[i].startsWith(':')) paramMap.set(segs[i].slice(1), decodeURIComponent(this.urlRoute[i]))
            else if (segs[i] !== this.urlRoute[i]) { match = false; break }
          }
          if (match) { matchedHandler = h; break }
        }
      }

      const context: MiddlewareContext = { request: this.request, urlParse: this.urlParse, paramMap }

      const isPathMatch = (path: string): boolean => {
        const segs = path.split('/').filter(s => s !== '')
        if (segs.length > this.urlRoute.length) return false
        return segs.every((s, i) => s.startsWith(':') || s === this.urlRoute[i])
      }

      const matchedMiddlewares: MiddlewareFn[] = []
      for (const mw of this.middlewares) {
        if (typeof mw === 'function') matchedMiddlewares.push(mw)
        else if (mw.paths.some(p => isPathMatch(p))) matchedMiddlewares.push(mw.middleware)
      }

      const executeChain = async (idx: number): Promise<Response> => {
        if (idx < matchedMiddlewares.length) {
          return matchedMiddlewares[idx](context, () => executeChain(idx + 1))
        }
        if (!matchedHandler) {
          return new Response(JSON.stringify({ code: -1, data: 'Route not found' }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }, status: 404
          })
        }
        let r = matchedHandler.handler(paramMap, this.request, this.urlParse)
        if (r instanceof Promise) r = await r
        return r
      }

      let result = await executeChain(0)
      const origin = this.request.headers.get('Origin')
      let allowed = `https://${config.allowCors}`
      if (origin) {
        try {
          const u = new URL(origin)
          if (u.hostname === config.allowCors || u.hostname.endsWith('.' + config.allowCors))
            allowed = origin
        } catch {}
      }
      result.headers.append('Access-Control-Allow-Origin', allowed)
      result.headers.append('Access-Control-Allow-Credentials', 'true')
      return result
    } catch (err) {
      console.error(err)
      return new Response(JSON.stringify({ code: -1, data: 'Internal server error', __debug: err instanceof Error ? err.message : '' }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }, status: 500
      })
    }
  }

  private addHandler(url: string, handler: HandlerFn, method: string) {
    const normUrl = url.startsWith('/') ? url : '/' + url
    const h: HandlerDef = { url: normUrl, handler, method }
    this.handlers.push(h)
    if (!this.methodIndex.has(method)) this.methodIndex.set(method, [])
    this.methodIndex.get(method)!.push(h)
  }

  use(mw: MiddlewareFn): void
  use(path: string, mw: MiddlewareFn): void
  use(paths: string[], mw: MiddlewareFn): void
  use(a: any, b?: any) {
    if (typeof a === 'function') this.middlewares.push(a)
    else {
      const paths = typeof a === 'string' ? [a] : a
      this.middlewares.push({ paths: paths.map((p: string) => p.startsWith('/') ? p : '/' + p), middleware: b })
    }
  }

  get(url: string, handler: HandlerFn) { this.addHandler(url, handler, 'get') }
  post(url: string, handler: HandlerFn) { this.addHandler(url, handler, 'post') }
  put(url: string, handler: HandlerFn) { this.addHandler(url, handler, 'put') }
  delete(url: string, handler: HandlerFn) { this.addHandler(url, handler, 'delete') }
}

export default ResponseFrame
