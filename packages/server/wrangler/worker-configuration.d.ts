interface Env {
  BLOG_DATA: KVNamespace
  EXPO_PUBLIC_SUPABASE_URL: string
  EXPO_PUBLIC_SUPABASE_KEY: string
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void
  passThroughOnException(): void
}

declare module 'cloudflare:workers' {
  export const env: Env
}

declare class KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

declare class ExportedHandler<T = Env> {
  fetch(request: Request, env: T, ctx: ExecutionContext): Response | Promise<Response>
}
