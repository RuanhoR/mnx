import { HandlerFn, HandlerGroup, HandlerRecord, supportMethod, Middleware, MiddlewareWithPaths } from "./types";
class ResponseFrame {
  private urlParse: URL;
  private handlers: HandlerRecord = [];
  private middlewares: (Middleware | MiddlewareWithPaths)[] = [];
  private urlRoute: string[];

  constructor(private request: Request) {
    this.urlParse = new URL(request.url);
    this.urlRoute = this.urlParse.pathname.split("/").filter(segment => segment !== "");
  }
  public async handlerRequest(): Promise<Response> {
    try {
      const method = this.request.method.toLowerCase();
      if (method == "options") {
        const requestOrigin = this.request.headers.get('Origin');
        let allowedOrigin = 'https://';

        if (requestOrigin) {
          try {
            const originUrl = new URL(requestOrigin);
            // 检查是否为 ruanhor.dpdns.org 的子域名
            if (originUrl.hostname === 'ruanhor.dpdns.org' ||
              originUrl.hostname.endsWith('.ruanhor.dpdns.org') || originUrl.hostname == "wei.qzz.io" || originUrl.hostname.endsWith(".wei.qzz.io")) {
              allowedOrigin = requestOrigin;
            }
          } catch (e) {
            // 无效的 Origin，使用默认值
          }
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

      // 查找匹配的路由
      for (const _handler of this.handlers) {
        const handler = _handler as HandlerGroup;
        // 方法匹配
        if (handler.method !== method) continue;

        // 解析路由模式
        const patternSegments = handler.url.split("/").filter(segment => segment !== "");

        // 长度必须匹配
        if (patternSegments.length !== this.urlRoute.length) continue;

        // 逐个匹配并提取参数
        paramMap.clear();
        let isMatch = true;

        for (let i = 0; i < patternSegments.length; i++) {
          const segment = patternSegments[i];

          if (segment.startsWith(":")) {
            // 参数段，保存到Map
            const paramName = segment.slice(1);
            paramMap.set(paramName, decodeURIComponent(this.urlRoute[i]));
          } else if (segment !== this.urlRoute[i]) {
            // 静态段不匹配
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          matchedHandler = handler;
          break;
        }
      }

      // 构建中间件执行链
      const context = {
        request: this.request,
        urlParse: this.urlParse,
        paramMap
      };

      // 路径匹配辅助函数 - 前缀匹配
      const isPathMatch = (path: string): boolean => {
        const patternSegments = path.split("/").filter(segment => segment !== "");
        if (patternSegments.length > this.urlRoute.length) return false;

        for (let i = 0; i < patternSegments.length; i++) {
          const segment = patternSegments[i];
          if (segment.startsWith(":")) continue; // 参数段忽略
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
      let allowedOrigin = 'https://ruanhor.dpdns.org';
      if (requestOrigin) {
        try {
          const originUrl = new URL(requestOrigin);
          if (originUrl.hostname === 'ruanhor.dpdns.org' ||
            originUrl.hostname.endsWith('.ruanhor.dpdns.org') ||
            originUrl.hostname === 'wei.qzz.io' ||
            originUrl.hostname.endsWith('.wei.qzz.io')) {
            allowedOrigin = requestOrigin;
          }
        } catch (e) { }
      }

      result.headers.append('Access-Control-Allow-Origin', allowedOrigin)
      result.headers.append('Access-Control-Allow-Credentials', 'true')
      return result;
    } catch (err: unknown) {
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
    // 验证URL格式
    if (!url || typeof url !== "string") {
      throw new Error("[frame]: Invalid URL");
    }

    // 验证handler
    if (!handler || typeof handler !== "function") {
      throw new Error("[frame]: Handler must be a function");
    }

    this.handlers.push({
      url: url.startsWith("/") ? url : "/" + url, // 确保以/开头
      handler,
      method
    });
  }

  public use(middleware: Middleware): void;
  public use(path: string, middleware: Middleware): void;
  public use(paths: string[], middleware: Middleware): void;
  public use(arg1: string | string[] | Middleware, arg2?: Middleware): void {
    if (typeof arg1 === "function") {
      // 全局中间件
      if (typeof arg1 !== "function") {
        throw new Error("[frame]: Middleware must be a function");
      }
      this.middlewares.push(arg1);
    } else {
      // 带路径的中间件
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