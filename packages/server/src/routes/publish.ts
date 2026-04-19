import { env } from "cloudflare:workers";
import ResponseFrame from "../framework";
import { json } from "../framework-utils";
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
    const sessionKey = `publish-session:${user.uid}:${scope}:${name}`;
    await env.BLOG_DATA.put(sessionKey, JSON.stringify({
      metadata,
      createdAt: Date.now(),
      user: user.uid
    }), { expirationTtl: 60 * 5 });

    return json({
      code: 200,
      data: { sessionKey }
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
  const scope = data.get("scope") as string;
  const name = data.get("name") as string;

  try {
    const sessionKey = `publish-session:${user.uid}:${scope}:${name}`;
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
  const name = data.get("name") as string;
  const version = data.get("version") as string;

  try {
    const result = await PublishManager.unpublishPackage(scope, name, version);
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
  const result = await PublishManager.listPackage(user);
  return json({
    code: result.code,
    data: result.data
  }, result.success ? 200 : 400);
};

export function RegerPUblishRouter(frame: ResponseFrame) {
  frame.post("/publish/session/:scope/:name/create", uploadMetadata);
  frame.post("/publish/session/:scope/:name/upload", uploadZip);
  frame.post("/unpublish/:scope/:name/:version", unpublishPackage);
  frame.post("/account/publish/list", ListPackage);
}