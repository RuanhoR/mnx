import { env } from "cloudflare:workers";
import ResponseFrame from "../framework";
import { json, verifyType } from "../framework-utils";
import { PublishManager } from "../publish/publish";
import { KVLockManager } from "../publish/kv-lock";
import { HandlerFn, User, PublishMetadata } from "../types";

const uploadMetadata: HandlerFn = async (data, request, _) => {
  const _user = data.get("__user");
  if (!_user) {
    return json({
      code: -1,
      data: "verify failed"
    }, 400);
  }

  const user = JSON.parse(_user) as User;
  const scope = data.get("scope") as string;
  if (!scope.startsWith("@")) {
    return json({
      code: -1,
      data: "scope must start with @"
    }, 400);
  }
  const name = data.get("name") as string;
  const isLocked = await KVLockManager.hasLock(scope, name);
  if (isLocked) {
    return json({
      code: -1,
      data: `Package ${scope}/${name} is currently being published. Please try again later.`
    }, 423);
  }

  try {
    const metadata = await request.json() as PublishMetadata;
    if (!verifyType(metadata, {
      readme: "string",
      scope: "string",
      name: 'string',
      version: 'string',
      version_tag: 'string'
    })) return json({
      code: -1,
      data: "Bad format"
    }, 400)
    if (!metadata.scope.startsWith("@")) return json({
      code: -1,
      data: "scope must start with @"
    }, 400)
    if (metadata.name.length < 1 || !/[a-zA-Z0-9_]/.test(metadata.name)) return json({
      code: -1,
      data: "Bad name"
    }, 400)
    metadata.scope = metadata.scope.slice(1);
    const sessionId = crypto.randomUUID();
    const sessionKey = `publish-session:${sessionId}`;
    await env.BLOG_DATA.put(sessionKey, JSON.stringify({
      metadata,
      createdAt: Date.now(),
      user: user.uid
    }), { expirationTtl: 60 * 5 });

    return json({
      code: 200,
      data: { sessionId }
    });
  } catch (error) {
    return json({
      code: -1,
      data: "Invalid metadata format"
    }, 400);
  }
};

const uploadZip: HandlerFn = async (data, request, _) => {
  const _user = data.get("__user");
  if (!_user) {
    return json({
      code: -1,
      data: "verify failed"
    }, 400);
  }

  const user = JSON.parse(_user) as User;
  const session = data.get("session") as string;

  if (!session) {
    return json({
      code: -1,
      data: "No publish session provided"
    }, 400);
  }

  try {
    const sessionKey = `publish-session:${session}`;
    const sessionData = await env.BLOG_DATA.get(sessionKey);
    if (!sessionData) {
      return json({
        code: -1,
        data: "Publish session expired or not found"
      }, 400);
    }

    const { metadata } = JSON.parse(sessionData) || {};
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return json({
        code: -1,
        data: "No file provided"
      }, 400);
    }

    // 在路由层也检查文件类型和大小
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      return json({
        code: -1,
        data: "Only zip files are supported"
      }, 400);
    }

    // 检查文件大小 (<40MB)
    const MAX_SIZE = 40 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return json({
        code: -1,
        data: "File size exceeds 40MB limit"
      }, 400);
    }

    if (file.size === 0) {
      return json({
        code: -1,
        data: "File is empty"
      }, 400);
    }
    const result = await PublishManager.publish(user, metadata, file);
    await env.BLOG_DATA.delete(sessionKey);
    return json({
      code: result.code,
      data: result.message
    }, result.success ? 200 : 400);
  } catch (error) {
    console.error("Failed to upload package:", error);
    return json({
      code: -1,
      data: error instanceof Error ? error.message : "Upload failed"
    }, 500);
  }
};

const unpublishPackage: HandlerFn = async (data, request, _) => {
  const _user = data.get("__user");
  if (!_user) {
    return json({
      code: -1,
      data: "verify failed"
    }, 400);
  }

  const user = JSON.parse(_user) as User;
  if (!user.uid) return json({
    cde: -1,
    data: "verify failed"
  }, 400)
  const scope = data.get("scope") as string;
  if (!scope.startsWith("@")) {
    return json({
      code: -1,
      data: "scope must start with @"
    }, 400);
  }
  const normalizedScope = scope.slice(1);
  const name = data.get("name") as string;
  const version = data.get("version") as string;

  try {
    const result = await PublishManager.unpublishPackage(normalizedScope, name, version);
    return json({
      code: result.code,
      data: result.message
    }, result.success ? 200 : 400);
  } catch (error) {
    console.error("Failed to unpublish package:", error);
    return json({
      code: -1,
      data: "Unpublishing failed"
    }, 500);
  }
};
const ListPackage: HandlerFn = async (data, request, _) => {
  const _user = data.get("__user");
  if (!_user) {
    return json({
      code: -1,
      data: "verify failed"
    }, 400);
  }

  const user = JSON.parse(_user) as User;
  const result = await PublishManager.listPackages(user);
  return json({
    code: result.code,
    data: result.data
  }, result.success ? 200 : 400);
};

const downloadPackage: HandlerFn = async (data, request, _) => {
  const scope = data.get("scope") as string;
  const name = data.get("name") as string;
  const version = data.get("version") as string;
  if (!scope || !name || !version) {
    return json({
      code: -1,
      data: "No param: scope or name or version"
    }, 400);
  }
  if (!scope.startsWith("@")) {
    return json({
      code: -1,
      data: "scope is not /@.*/"
    }, 400);
  }
  const normalizedScope = scope.slice(1);
  if (!/^[a-zA-Z0-9\-\._]+$/.test(name)) {
    return json({
      code: -1,
      data: "package name format error"
    }, 400);
  }

  if (!/^[a-zA-Z0-9\-\._]+$/.test(version)) {
    return json({
      code: -1,
      data: "version format error"
    }, 400);
  }

  try {
    console.log(`Download attempt: @${normalizedScope}/${name} v${version} from ${request.headers.get("user-agent") || "unknown client"}`);

    const downloadResult = await PublishManager.downloadVersion(normalizedScope, name, version);

    if (!downloadResult.success) {
      console.warn(`Download failed for @${normalizedScope}/${name} v${version}: ${downloadResult.error}`);
      if (downloadResult.error?.includes("not found")) {
        return json({
          code: 404,
          data: "Not found"
        }, 404);
      }

      return json({
        code: -1,
        data: "Download Error"
      }, 500);
    }
    const safeName = name.replace(/[^a-zA-Z0-9\-\._]/g, "_");
    const safeVersion = version.replace(/[^a-zA-Z0-9\-\._]/g, "_");
    const filename = `${normalizedScope}-${safeName}-${safeVersion}.zip`;
    if (!downloadResult.data) return json({
      code: -1,
      data: "no data"
    }, 201)
    return new Response(downloadResult.data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": downloadResult.data.size.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "X-Package-Server": "pmnx",
        "X-Pmnx-Sao": "？！强强！？",
        "Expires": "0",
        "X-Package-Scope": normalizedScope,
        "X-Package-Name": name,
        "X-Package-Version": version,
        "X-Download-Success": "true"
      },
      status: 200
    });
  } catch (error) {
    console.error(`Download route error for @${scope.slice(1)}/${name} v${version}:`, error);

    return json({
      code: -1,
      data: error instanceof Error ? error.message : "Download error"
    }, 500);
  }
};

const packageInfoAllVersion: HandlerFn = async (data, _, __) => {
  const scope = data.get("scope") as string;
  const name = data.get("name") as string;

  if (!name || !scope || !scope.startsWith("@")) {
    return json({
      code: -1,
      data: "Bad format"
    }, 400);
  }

  try {
    const result = await PublishManager.packageInfo(scope.slice(1), name);
    if (!result || result.id == "") {
      return json({
        code: -1,
        data: "Not found"
      }, 404);
    }

    return json({
      code: 200,
      data: result,
    }, 200);
  } catch (error) {
    console.error("packageInfoAllVersion error:", error);
    return json({
      code: -1,
      data: "Server error"
    }, 500);
  }
};

const PackageInfo: HandlerFn = async (data, _, __) => {
  const scope = data.get("scope") as string;
  const name = data.get("name") as string;
  const version = data.get("version") as string;
  if (!name || !scope || !version || !scope.startsWith("@")) {
    return json({
      code: -1,
      data: "Bad format"
    }, 400)
  };;
  const result = await PublishManager.packageInfoForAVersion(scope.slice(1), name, version);
  if (result.id.length < 1) {
    return json({
      code: -1,
      data: "Not found"
    }, 404)
  };
  return json({
    code: 200,
    data: result,
  }, 200)
}
export function RegerPUblishRouter(frame: ResponseFrame) {
  frame.post("/publish/session/:scope/:name/create", uploadMetadata);
  frame.post("/publish/session/:session/upload", uploadZip);
  frame.post("/unpublish/:scope/:name/:version", unpublishPackage);
  frame.get("/account/publish/list", ListPackage);
  frame.get("/package/:scope/:name/v/:version/info", PackageInfo);
  frame.get("/package/:scope/:name/info", packageInfoAllVersion)
  frame.get("/package/:scope/:name/v/:version/download", downloadPackage);
}