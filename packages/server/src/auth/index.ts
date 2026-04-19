import config from "../config";
import supabase from "../supabase";
import { hashWithSalt, ramdonValue } from "./hash";

type FindUserParams = {
  id?: number;
  name?: string;
  mail?: string;
};
type UpdateUserParams = {
  name?: string
  mail?: string
  password?: string
  avatar_url?: string
  friends?: number[]
  friends_request?: number[]
};

class AuthUtils {
  public static async find({
    id,
    name,
    mail
  }: FindUserParams) {
    let query = supabase.users.select('*');
    if (id) {
      query = query.eq("uid", id);
    }
    if (name) {
      query = query.eq("name", name);
    }
    if (mail) {
      query = query.eq("mail", mail);
    }
    return await query;
  }
  public static async passwordHash(value: string): Promise<string> {
    const salt = ramdonValue();
    const hash = await hashWithSalt(value, salt, config.passworditeration, 256);
    return `${salt}:${hash}`
  }
  public static async verifyPassword(inputPassword: string, storedPassword: string): Promise<boolean> {
    const [salt, storedHash] = storedPassword.split(':');
    if (!salt || !storedHash) {
      return false;
    }
    const inputHash = await hashWithSalt(inputPassword, salt, config.passworditeration, 256);
    return inputHash === storedHash;
  }
  public static async add(name: string, password: string, mail: string): Promise<number> {
    const parsedPassword = await AuthUtils.passwordHash(password);
    const result = await supabase.users.insert({
      name,
      password: parsedPassword,
      mail
    }).select();
    if (result.data && result.data.length > 0) {
      return result.data[0].uid;
    }
    throw new Error("Failed to add user");
  }
  public static async remove({
    id,
    name,
    mail
  }: FindUserParams) {
    let query = supabase.users.delete();
    if (id) {
      query = query.eq("uid", id)
    }
    if (name) {
      query = query.eq("name", name)
    }
    if (mail) {
      query = query.eq("mail", mail)
    }
    return await query;
  }
  public static async update(
    params: FindUserParams,
    data: UpdateUserParams
  ) {
    // 创建一个干净的更新数据对象
    const updateData: Partial<UpdateUserParams> = { ...data };

    // 如果要更新密码，进行哈希处理
    if (data.password) {
      updateData.password = await AuthUtils.passwordHash(data.password);
    }

    let query = supabase.users.update(updateData);
    if (params.id) {
      query = query.eq("uid", params.id);
    } else if (params.name) {
      query = query.eq("name", params.name);
    } else if (params.mail) {
      query = query.eq("mail", params.mail);
    } else {
      throw new Error("No filter provided for update operation");
    }

    return await query;
  }
}
export {
  AuthUtils as Auth
}