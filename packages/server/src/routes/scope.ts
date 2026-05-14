import ResponseFrame from "../framework";
import { json } from "../framework-utils";
import supabase from "../supabase";
import { User } from "../types";

function generateRandomString(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function isScopeNameTaken(name: string): Promise<boolean> {
  const result = await supabase.pmnxScope.select("id").eq("name", name).limit(1);
  return result.data !== null && result.data.length > 0;
}

async function findAvailableScopeName(baseName: string): Promise<string> {
  let name = baseName.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
  if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
    name = 'scope';
  }
  
  if (!(await isScopeNameTaken(name))) {
    return name;
  }

  for (let i = 0; i < 100; i++) {
    const candidate = `${name}_${generateRandomString(6)}`;
    if (!(await isScopeNameTaken(candidate))) {
      return candidate;
    }
  }

  return `${name}_${generateRandomString(8)}`;
}

async function getMyScope(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    const userJson = data.get("__user");
    if (!userJson) {
      return json({
        code: -1,
        message: "User authentication required"
      }, 401);
    }

    const user = JSON.parse(userJson) as User;

    const scopeResult = await supabase.pmnxScope.select("*").eq("user", user.uid).limit(1);

    if (scopeResult.error) {
      console.error("Error getting scope:", scopeResult.error);
      return json({
        code: -1,
        message: "Failed to get scope"
      }, 500);
    }

    if (!scopeResult.data || scopeResult.data.length === 0) {
      return json({
        code: -1,
        message: "No scope found",
        data: null
      });
    }

    const scope = scopeResult.data[0];
    return json({
      code: 200,
      message: "Scope retrieved successfully",
      data: {
        name: scope.name,
        created_at: new Date(scope.created_at).toISOString()
      }
    });

  } catch (error) {
    console.error("Error getting scope:", error);
    return json({
      code: -1,
      message: "Internal server error"
    }, 500);
  }
}

async function setScope(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    const userJson = data.get("__user");
    if (!userJson) {
      return json({
        code: -1,
        message: "User authentication required"
      }, 401);
    }

    const user = JSON.parse(userJson) as User;

    const existingScope = await supabase.pmnxScope.select("id, name").eq("user", user.uid).limit(1);
    const isNewScope = !existingScope.data || existingScope.data.length === 0;

    const body = await request.json().catch(() => null) as { name?: string } | null;
    let scopeName: string;

    if (body && body.name && body.name.trim()) {
      scopeName = body.name.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_\-]+$/.test(scopeName)) {
        return json({
          code: -1,
          message: "Invalid scope name. Only letters, numbers, underscores and hyphens are allowed"
        }, 400);
      }
    } else {
      scopeName = await findAvailableScopeName(user.name || 'user');
    }

    const nameExistsResult = await supabase.pmnxScope.select("id").eq("name", scopeName).limit(1);
    if (nameExistsResult.data && nameExistsResult.data.length > 0) {
      scopeName = await findAvailableScopeName(scopeName);
    }

    let result;
    if (isNewScope) {
      result = await supabase.pmnxScope.insert({
        user: user.uid,
        name: scopeName,
        created_at: new Date()
      }).select();
    } else {
      result = await supabase.pmnxScope.update({
        name: scopeName
      }).eq("user", user.uid).select();
    }

    if (result.error) {
      console.error("Error setting scope:", result.error);
      return json({
        code: -1,
        message: "Failed to set scope"
      }, 500);
    }

    const scope = result.data[0];
    return json({
      code: 200,
      message: isNewScope ? "Scope created successfully" : "Scope updated successfully",
      data: {
        name: scope.name,
        created_at: new Date(scope.created_at).toISOString()
      }
    });

  } catch (error) {
    console.error("Error setting scope:", error);
    return json({
      code: -1,
      message: error instanceof Error ? error.message : "Internal server error"
    }, 500);
  }
}

export function RegisterScopeRouter(frame: ResponseFrame) {
  frame.get("/account/scope/my", getMyScope);
  frame.post("/account/scope/set", setScope);
}