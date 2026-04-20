import config from "./config";
import { HandlerFn, HandlerGroup, HandlerRecord, supportMethod, Middleware, MiddlewareWithPaths } from "./types";
class ResponseFrame {
  private urlParse: URL;
  private handlers: HandlerRecord = [];
  private middlewares: (Middleware | MiddlewareWithPaths)[] = [];
  private urlRoute: string[];
  private handlerIndex: Map<string, HandlerGroup> = new Map(); // 路由索引
  private methodIndex: Map<string, HandlerGroup[]> = new Map(); // 方法索引

  constructor(private request: Request) {
    this.urlParse = new URL(request.url);
    this.urlRoute = this.urlParse.pathname.split("/").filter(segment => segment !== "");
  }
  public async handlerRequest(): Promise<Response> {
    try {
      const method = this.request.method.toLowerCase();
      if (method == "options") {
        const requestOrigin = this.request.headers.get('Origin');
        let allowedOrigin = 'https://' + config.allowCors;
        if (requestOrigin) {
          try {
            const originUrl = new URL(requestOrigin);
            if (originUrl.hostname === config.allowCors ||
              originUrl.hostname.endsWith("." + config.allowCors)) {
              allowedOrigin = requestOrigin;
            }
          } catch { }
        }

        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true'
          }
        })
      }
      let matchedHandler: HandlerGroup | undefined = undefined;
      let paramMap = new Map<string, string>();

      // 使用索引优化路由查找
      const methodHandlers = this.methodIndex.get(method);
      if (methodHandlers) {
        // 快速过滤相同长度路径
        const sameLengthHandlers = methodHandlers.filter(handler => {
          const patternSegments = handler.url.split("/").filter(segment => segment !== "");
          return patternSegments.length === this.urlRoute.length;
        });

        for (const handler of sameLengthHandlers) {
          const patternSegments = handler.url.split("/").filter(segment => segment !== "");
          paramMap.clear();
          let isMatch = true;

          for (let i = 0; i < patternSegments.length; i++) {
            const segment = patternSegments[i];
            if (segment.startsWith(":")) {
              const paramName = segment.slice(1);
              paramMap.set(paramName, decodeURIComponent(this.urlRoute[i]));
            } else if (segment !== this.urlRoute[i]) {
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            matchedHandler = handler;
            break;
          }
        }
      }
      const context = {
        request: this.request,
        urlParse: this.urlParse,
        paramMap
      };
      const isPathMatch = (path: string): boolean => {
        const patternSegments = path.split("/").filter(segment => segment !== "");
        if (patternSegments.length > this.urlRoute.length) return false;

        for (let i = 0; i < patternSegments.length; i++) {
          const segment = patternSegments[i];
          if (segment.startsWith(":")) continue;
          if (segment !== this.urlRoute[i]) return false;
        }
        return true;
      };
      const matchedMiddlewares: Middleware[] = [];
      for (const mw of this.middlewares) {
        if (typeof mw === "function") {
          matchedMiddlewares.push(mw);
        } else {
          const hasMatch = mw.paths.some(path => isPathMatch(path));
          if (hasMatch) {
            matchedMiddlewares.push(mw.middleware);
          }
        }
      }
      const executeChain = async (index: number): Promise<Response> => {
        if (index < matchedMiddlewares.length) {
          const middleware = matchedMiddlewares[index];
          console.log(matchedHandler)
          return middleware(context, () => executeChain(index + 1));
        } else {
          if (!matchedHandler) {
            return new Response(
              JSON.stringify({
                code: -1,
                data: "Route not found"
              }),
              {
                headers: {
                  "Content-Type": "application/json; charset=utf-8"
                },
                status: 404
              }
            );
          }

          let result = matchedHandler.handler(paramMap, this.request, this.urlParse);
          if (result instanceof Promise) {
            result = await result;
          }
          return result;
        }
      };
      let result = await executeChain(0);
      const requestOrigin = this.request.headers.get('Origin');
      let allowedOrigin = `https://${config.allowCors}`;
      if (requestOrigin) {
        try {
          const originUrl = new URL(requestOrigin);
          if (originUrl.hostname === config.allowCors ||
            originUrl.hostname.endsWith("." + config.allowCors)) {
            allowedOrigin = requestOrigin;
          }
        } catch { }
      }

      result.headers.append('Access-Control-Allow-Origin', allowedOrigin)
      result.headers.append('Access-Control-Allow-Credentials', 'true')
      return result;
    } catch (err) {
      console.error(err);
      return new Response(
        JSON.stringify({
          code: -1,
          data: "Internal server error",
          __debug: err instanceof Error ? err.message : "unknown error"
        }),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          status: 500
        }
      );
    }
  }

  private addHandlerFn(url: string, handler: HandlerFn, method: typeof supportMethod[number]) {
    if (!url || typeof url !== "string") {
      throw new Error("[frame]: Invalid URL");
    }
    if (!handler || typeof handler !== "function") {
      throw new Error("[frame]: Handler must be a function");
    }

    const normalizedUrl = url.startsWith("/") ? url : "/" + url;
    const handlerGroup: HandlerGroup = {
      url: normalizedUrl,
      handler,
      method
    };

    this.handlers.push(handlerGroup);
    const patternKey = `${method}:${normalizedUrl}`;
    this.handlerIndex.set(patternKey, handlerGroup);
    if (!this.methodIndex.has(method)) {
      this.methodIndex.set(method, []);
    }
    this.methodIndex.get(method)!.push(handlerGroup);
  }

  public use(middleware: Middleware): void;
  public use(path: string, middleware: Middleware): void;
  public use(paths: string[], middleware: Middleware): void;
  public use(arg1: string | string[] | Middleware, arg2?: Middleware): void {
    if (typeof arg1 === "function") {
      if (typeof arg1 !== "function") {
        throw new Error("[frame]: Middleware must be a function");
      }
      this.middlewares.push(arg1);
    } else {
      const paths = typeof arg1 === "string" ? [arg1] : arg1;
      const middleware = arg2!;

      if (!middleware || typeof middleware !== "function") {
        throw new Error("[frame]: Middleware must be a function");
      }

      this.middlewares.push({
        paths: paths.map(p => p.startsWith("/") ? p : "/" + p),
        middleware
      });
    }
  }

  public delete(url: string, handler: HandlerFn): void {
    this.addHandlerFn(url, handler, "delete");
  }

  public put(url: string, handler: HandlerFn): void {
    this.addHandlerFn(url, handler, "put");
  }

  public get(url: string, handler: HandlerFn): void {
    this.addHandlerFn(url, handler, "get");
  }

  public post(url: string, handler: HandlerFn): void {
    this.addHandlerFn(url, handler, "post");
  }
}

export default ResponseFrame;