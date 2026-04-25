import ResponseFrame from "../framework";
import { PublishToken, TokenPermission } from "../publish/token";
import { json } from "../framework-utils";
interface TokenGenerationRequest {
  name: string;
  permissions: string[];
  scopes: string[];
  expirationTime?: number;
}

/**
 * Generate token endpoint
 */
async function genToken(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    void 0
    const userJson = data.get("__user");
    if (!userJson) {
      return json({
        code: -1,
        message: "User authentication required"
      }, 401);
    }

    const user = JSON.parse(userJson);

    // Parse request body
    const body = await request.json().catch(() => null) as TokenGenerationRequest | null;
    if (!body || !body.name || !body.permissions || !body.scopes) {
      return json({
        code: -1,
        message: "Request body must include name, permissions, and scopes fields"
      }, 400);
    }

    const { name, permissions, scopes, expirationTime } = body;
    const permissionEnums = permissions.map((p: string) => {
      const permissionValue = TokenPermission[p as keyof typeof TokenPermission];
      if (permissionValue === void 0) {
        throw new Error(`Invalid permission: ${p}`);
      }
      return permissionValue;
    });

    // Validate scopes
    if (!Array.isArray(scopes) || scopes.length === 0) {
      return json({
        code: -1,
        message: "At least one scope is required"
      }, 400);
    }

    // Create the token
    const createdToken = await PublishToken.createToken(
      name,
      user.uid,
      permissionEnums,
      scopes,
      expirationTime
    );

    if (!createdToken) {
      return json({
        code: -1,
        message: "Failed to create token"
      }, 500);
    }

    return json({
      code: 200,
      message: "Token created successfully",
      data: {
        token: createdToken.token,
        id: createdToken.id,
        name: createdToken.name,
        scopes: createdToken.scope,
        permissions: createdToken.permission,
        expiresAt: createdToken.time || null
      }
    });

  } catch (error) {
    console.error("Error generating token:", error);
    const status = error instanceof Error && error.message.includes("Invalid") ? 400 : 500;
    return json({
      code: -1,
      message: error instanceof Error ? error.message : "Internal server error"
    }, status);
  }
}

/**
 * Delete token endpoint
 */
async function deleteToken(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    const userJson = data.get("__user");
    if (!userJson) {
      return json({
        code: -1,
        message: "User authentication required"
      }, 401);
    }

    const user = JSON.parse(userJson);

    // Get token name from URL parameters
    const tokenName = data.get("name");
    if (!tokenName) {
      return json({
        code: -1,
        message: "Token name parameter is required"
      }, 400);
    }

    // Delete the token
    const result = await PublishToken.deleteToken({ content: tokenName });

    if (!result) {
      return json({
        code: -1,
        message: "Failed to delete token or token not found"
      }, 404);
    }

    return json({
      code: 200,
      message: "Token deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting token:", error);
    return json({
      code: -1,
      message: "Internal server error"
    }, 500);
  }
}

/**
 * List tokens endpoint
 */
async function listTokens(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    const userJson = data.get("__user");
    if (!userJson) {
      return json({
        code: -1,
        message: "User authentication required"
      }, 401);
    }

    const user = JSON.parse(userJson);

    // List user's tokens
    const tokens = await PublishToken.listToken(user);

    // Filter sensitive information from the response
    const sanitizedTokens = tokens.map(t => ({
      id: t.id,
      name: t.name,
      scopes: t.scope,
      permissions: t.permission,
      createdAt: t.created_at,
      expiresAt: t.time
    }));

    return json({
      code: 200,
      message: "Tokens retrieved successfully",
      data: sanitizedTokens
    });

  } catch (error) {
    console.error("Error listing tokens:", error);
    return json({
      code: -1,
      message: "Internal server error"
    }, 500);
  }
}
async function tokenVerify(data: Map<string, string>, request: Request, url: URL): Promise<Response> {
  try {
    const token = data.get("token");
    if (!token) {
      return json({
        code: -1,
        message: "Token parameter is required"
      }, 400);
    }
    const user = await PublishToken.verifyTokenASProfile(token);
    if (user) {
      delete (user as any).friends_request;
      delete (user as any).friends;
      delete (user as any).password;
      return json({
        code: 200,
        message: "Token verified successfully",
        data: user
      });
    } else {
      return json({
        code: -1,
        message: "Invalid token"
      }, 401);
    }
  } catch (error) {
    return json({
      code: -1,
      message: "Internal server error"
    }, 500);
  }
}
export function RegisterTokenRouter(frame: ResponseFrame) {
  frame.post("/account/publish/token/gen", genToken);
  frame.delete("/account/publish/token/delete/:name", deleteToken)
  frame.get("/account/publish/token/list", listTokens);
  frame.get("/token/:token/verify", tokenVerify)
}