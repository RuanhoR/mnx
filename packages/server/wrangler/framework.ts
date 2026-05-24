import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';

export class KV {
	static async get(key: string): Promise<string | null> {
		return env.BLOG_DATA.get(key);
	}
	static async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
		await env.BLOG_DATA.put(key, value, options);
	}
	static async delete(key: string): Promise<void> {
		await env.BLOG_DATA.delete(key);
	}
}

const supabaseClient = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_KEY);

export class DB {
	static get users() {
		return supabaseClient.from('user_table');
	}
	static get packages() {
		return supabaseClient.from('mnx_packages');
	}
	static get scopes() {
		return supabaseClient.from('mnx_scope');
	}
	static get readmes() {
		return supabaseClient.from('mnx_readme');
	}
	static get publishTokens() {
		return supabaseClient.from('publish-token');
	}
}

export class Storage {
	static async upload(path: string, file: File | Blob | ArrayBuffer | ReadableStream) {
		return supabaseClient.storage.from('mnx').upload(path, file);
	}
	static async remove(paths: string[]) {
		return supabaseClient.storage.from('mnx').remove(paths);
	}
	static async createSignedUrl(path: string, expiresIn: number = 60) {
		return supabaseClient.storage.from('mnx').createSignedUrl(path, expiresIn);
	}
	static async download(path: string) {
		return supabaseClient.storage.from('mnx').download(path);
	}
	static async createReadableStream(path: string): Promise<{ stream: ReadableStream; size?: number } | { error: string }> {
		const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage.from('mnx').createSignedUrl(path, 60);
		if (signedUrlError || !signedUrlData?.signedUrl) {
			const downloadResult = await supabaseClient.storage.from('mnx').download(path);
			if (downloadResult.error || !downloadResult.data) {
				return { error: downloadResult.error?.message || 'File not found' };
			}
			return { stream: downloadResult.data.stream(), size: downloadResult.data.size };
		}
		const response = await fetch(signedUrlData.signedUrl);
		if (!response.ok || !response.body) {
			return { error: 'Failed to stream file' };
		}
		return { stream: response.body, size: parseInt(response.headers.get('content-length') || '0') };
	}
}

export function json(obj: object, status?: number): Response {
	return new Response(JSON.stringify(obj), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		status: status || 200,
	});
}

type TypeMap = {
	string: string;
	number: number;
	boolean: boolean;
	object: object;
	function: Function;
	symbol: symbol;
	undefined: undefined;
	bigint: bigint;
};

export function verifyType<T extends Record<string, keyof TypeMap>>(obj: any, verify: T): obj is { [K in keyof T]: TypeMap[T[K]] } {
	return Object.entries(verify).every(([key, type]) => typeof obj[key] === type);
}

export function parseArrayToString(data: string[]): string {
	return data
		.map((i) => {
			if (i.includes(String.fromCharCode(0))) throw new Error('[parse]: have \\u0000');
			return i;
		})
		.join(String.fromCharCode(0));
}

export function parseStringToArray(str: string): string[] {
	return str.split(String.fromCharCode(0));
}

export const config = {
	passworditeration: 2000,
	host: 'https://d.pmnx.qzz.io',
	allowCors: 'pmnx.qzz.io',
	accountApiHost: env.ACCOUNT_API_HOST,
};

type MiddlewareFn = (context: MiddlewareContext, next: () => Promise<Response>) => Response | Promise<Response>;
type MiddlewareDef = MiddlewareFn | { paths: string[]; middleware: MiddlewareFn };
type HandlerDef = { url: string; handler: HandlerFn; method: string };
type MiddlewareContext = { request: Request; urlParse: URL; paramMap: Map<string, string> };
type HandlerFn = (data: Map<string, string>, request: Request, url: URL) => Response | Promise<Response>;

class ResponseFrame {
	private urlParse: URL;
	private handlers: HandlerDef[] = [];
	private middlewares: MiddlewareDef[] = [];
	private urlRoute: string[];
	private methodIndex: Map<string, HandlerDef[]> = new Map();

	constructor(private request: Request) {
		this.urlParse = new URL(request.url);
		this.urlRoute = this.urlParse.pathname.split('/').filter((s) => s !== '');
	}

	async handlerRequest(): Promise<Response> {
		try {
			const method = this.request.method.toLowerCase();
			if (method === 'options') {
				const origin = this.request.headers.get('Origin');
				let allowed = 'https://' + config.allowCors;
				if (origin) {
					try {
						const u = new URL(origin);
						if (u.hostname === config.allowCors || u.hostname.endsWith('.' + config.allowCors)) allowed = origin;
					} catch {}
				}
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*' || allowed,
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
						'Access-Control-Allow-Credentials': 'true',
					},
				});
			}

			let matchedHandler: HandlerDef | undefined;
			let paramMap = new Map<string, string>();
			const methodHandlers = this.methodIndex.get(method);
			if (methodHandlers) {
				const sameLen = methodHandlers.filter((h) => {
					const segs = h.url.split('/').filter((s) => s !== '');
					return segs.length === this.urlRoute.length;
				});
				for (const h of sameLen) {
					const segs = h.url.split('/').filter((s) => s !== '');
					paramMap.clear();
					let match = true;
					for (let i = 0; i < segs.length; i++) {
						if (segs[i].startsWith(':')) paramMap.set(segs[i].slice(1), decodeURIComponent(this.urlRoute[i]));
						else if (segs[i] !== this.urlRoute[i]) {
							match = false;
							break;
						}
					}
					if (match) {
						matchedHandler = h;
						break;
					}
				}
			}

			const context: MiddlewareContext = { request: this.request, urlParse: this.urlParse, paramMap };

			const isPathMatch = (path: string): boolean => {
				const segs = path.split('/').filter((s) => s !== '');
				if (segs.length > this.urlRoute.length) return false;
				return segs.every((s, i) => s.startsWith(':') || s === this.urlRoute[i]);
			};

			const matchedMiddlewares: MiddlewareFn[] = [];
			for (const mw of this.middlewares) {
				if (typeof mw === 'function') matchedMiddlewares.push(mw);
				else if (mw.paths.some((p) => isPathMatch(p))) matchedMiddlewares.push(mw.middleware);
			}

			const executeChain = async (idx: number): Promise<Response> => {
				if (idx < matchedMiddlewares.length) {
					return matchedMiddlewares[idx](context, () => executeChain(idx + 1));
				}
				if (!matchedHandler) {
					return new Response(JSON.stringify({ code: -1, data: 'Route not found' }), {
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
						status: 404,
					});
				}
				let r = matchedHandler.handler(paramMap, this.request, this.urlParse);
				if (r instanceof Promise) r = await r;
				return r;
			};

			let result = await executeChain(0);
			const origin = this.request.headers.get('Origin');
			let allowed = `https://${config.allowCors}`;
			if (origin) {
				try {
					const u = new URL(origin);
					if (u.hostname === config.allowCors || u.hostname.endsWith('.' + config.allowCors)) allowed = origin;
				} catch {}
			}
			result.headers.append('Access-Control-Allow-Origin', '*' || allowed);
			result.headers.append('Access-Control-Allow-Credentials', 'true');
			return result;
		} catch (err) {
			console.error(err);
			return new Response(JSON.stringify({ code: -1, data: 'Internal server error', __debug: err instanceof Error ? err.message : '' }), {
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				status: 500,
			});
		}
	}

	private addHandler(url: string, handler: HandlerFn, method: string) {
		const normUrl = url.startsWith('/') ? url : '/' + url;
		const h: HandlerDef = { url: normUrl, handler, method };
		this.handlers.push(h);
		if (!this.methodIndex.has(method)) this.methodIndex.set(method, []);
		this.methodIndex.get(method)!.push(h);
	}

	use(mw: MiddlewareFn): void;
	use(path: string, mw: MiddlewareFn): void;
	use(paths: string[], mw: MiddlewareFn): void;
	use(a: any, b?: any) {
		if (typeof a === 'function') this.middlewares.push(a);
		else {
			const paths = typeof a === 'string' ? [a] : a;
			this.middlewares.push({ paths: paths.map((p: string) => (p.startsWith('/') ? p : '/' + p)), middleware: b });
		}
	}

	get(url: string, handler: HandlerFn) {
		this.addHandler(url, handler, 'get');
	}
	post(url: string, handler: HandlerFn) {
		this.addHandler(url, handler, 'post');
	}
	put(url: string, handler: HandlerFn) {
		this.addHandler(url, handler, 'put');
	}
	delete(url: string, handler: HandlerFn) {
		this.addHandler(url, handler, 'delete');
	}
}

export default ResponseFrame;
