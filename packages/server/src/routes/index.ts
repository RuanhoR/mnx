import { env } from "cloudflare:workers";
import ResponseFrame from "../framework";
import { json } from "../framework-utils";
import { RegisterTokenRouter } from "./token";
import { RegerPUblishRouter } from "./publish";
import { Auth } from "../auth";
import { PublishManager } from "../publish/publish";
import { TokenPermission } from "../publish/token";
import { Middleware } from "../types";
function commonPublicVerify(permisson: TokenPermission): Middleware {
  return async (c, next) => {
    const _token = c.request.headers.get("Authorization")
    if (!_token || !_token.startsWith("Bearer ")) return json({
      code: -1,
      data: "this route must have token"
    });
    if (!c.paramMap.has("scope") || !c.paramMap.has("name")) return json({
      code: -1,
      data: "not found"
    })
    const verifyResult = await PublishManager.verifyToken(_token as string, permisson, `${c.paramMap.get("scope") as string}/${c.paramMap.get("name") as string}`);
    if (!verifyResult) return json({
      code: -1,
      data: "verify failed"
    }, 400);
    c.paramMap.set("__user", JSON.stringify(verifyResult))
    return await next()
  }
}
export function RegerRoutes(frame: ResponseFrame) {
  frame.use("/account", async (c, next) => {
    const _token = c.request.headers.get("Authorization")
    if (!_token || !_token.startsWith("Bearer ")) return json({
      code: -1,
      data: "this route must have token"
    });
    const token = _token.slice(7);
    const uidString = await env.BLOG_DATA.get(`user-token:${token}`);
    if (!uidString) {
      return json({
        code: -1,
        data: "invalid token"
      });
    }

    const uid = parseInt(uidString);
    if (isNaN(uid)) {
      return json({
        code: -1,
        data: "invalid user data"
      });
    }

    const userResult = await Auth.find({ id: uid });
    if (!userResult.data || userResult.data.length === 0) {
      return json({
        code: -1,
        data: "user not found"
      });
    }

    const user = userResult.data[0];
    const userWithToken = { ...user, token };
    c.paramMap.set("__user", JSON.stringify(userWithToken));
    return await next();
  });
  frame.use("/unpublish/", commonPublicVerify(TokenPermission.unpublish));
  frame.use("/publish/", commonPublicVerify(TokenPermission.publish));
  RegisterTokenRouter(frame);
  RegerPUblishRouter(frame);
}