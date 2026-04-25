import supabase from "../supabase";
import { MNXPublishToken, User, FindTokenParam, UpdateTokenParams } from "../types";
import { uuidv4 } from "../utils/uuid";

export enum TokenPermission {
  unpublish = 0b1,
  publish = 0b10
}

export class PublishToken {
  static async verifyToken(token: string, mode: TokenPermission, scope: string): Promise<User | null> {
    const result = await supabase.pmnxPublishToken.select("token,permission,scope,user,id,time").eq("token", token).limit(1);
    if (!result.data || result.data.length <= 0) {
      return null;
    }
    const tokenData = result.data[0] as MNXPublishToken;

    // Check if token has expired
    if (tokenData.time && tokenData.time < Date.now()) {
      // Delete expired token
      await supabase.pmnxPublishToken.delete().eq("id", tokenData.id);
      return null;
    }

    // Check permissions using bitwise AND
    if ((tokenData.permission & mode) !== mode) {
      return null;
    }

    // Check scope
    if (!tokenData.scope.includes("*") && !tokenData.scope.includes(scope)) {
      return null;
    }

    // Get user information
    const userResult = await supabase.users.select("*").eq("uid", tokenData.user).limit(1);
    if (!userResult.data || userResult.data.length <= 0) {
      return null;
    }

    return userResult.data[0] as User;
  }

  static async createToken(name: string, user: number, permissions: TokenPermission[], scopes: string[], expirationTime?: number): Promise<MNXPublishToken | null> {
    const token = uuidv4();
    const permissionBitmask = permissions.reduce((acc, perm) => acc | perm, 0);

    const result = await supabase.pmnxPublishToken.insert({
      name,
      user,
      token,
      permission: permissionBitmask,
      scope: scopes,
      time: expirationTime || null,
      created_at: new Date()
    }).select();

    return result.data ? result.data[0] as MNXPublishToken : null;
  }

  static async deleteToken(params: FindTokenParam): Promise<boolean> {
    let query = supabase.pmnxPublishToken.delete();

    if (params.id) {
      query = query.eq("id", parseInt(params.id));
    }
    if (params.content) {
      query = query.eq("token", params.content);
    }

    const result = await query;
    return result.error === null;
  }
  static async verifyTokenASProfile(token: string): Promise<User | null> {
    const result = await supabase.pmnxPublishToken.select("token,permission,scope,user,id,time").eq("token", token).limit(1);
    if (!result.data || result.data.length <= 0) {
      return null;
    }
    const tokenData = result.data[0] as MNXPublishToken;
    // Check if token has expired
    if (tokenData.time && tokenData.time < Date.now()) {
      // Delete expired token
      await supabase.pmnxPublishToken.delete().eq("id", tokenData.id);
      return null;
    }
    // Get user information
    const userResult = await supabase.users.select("*").eq("uid", tokenData.user).limit(1);
    if (!userResult.data || userResult.data.length <= 0) {
      return null;
    }
    return userResult.data[0] as User;
  }
  static async listToken(user: User): Promise<MNXPublishToken[]> {
    const result = await supabase.pmnxPublishToken.select("*").eq("user", user.uid);
    return result.data ? result.data as MNXPublishToken[] : [];
  }

  static async setToken(params: FindTokenParam, updateData?: UpdateTokenParams): Promise<MNXPublishToken | null> {
    let query = supabase.pmnxPublishToken.update(updateData || {});

    if (params.id) {
      query = query.eq("id", parseInt(params.id));
    }
    if (params.content) {
      query = query.eq("token", params.content);
    }

    const result = await query.select();
    return result.data ? result.data[0] as MNXPublishToken : null;
  }
}