import { env } from "cloudflare:workers";

export class KVLockManager {
  private static readonly LOCK_PREFIX = "publish-lock:";
  private static readonly LOCK_TIMEOUT = 300;
  static async acquireLock(scope: string, name: string): Promise<boolean> {
    const lockKey = `${this.LOCK_PREFIX}${scope}/${name}`;
    const lockValue = Date.now().toString();
    try {
      const result = await env.BLOG_DATA.put(lockKey, lockValue, {
        expirationTtl: this.LOCK_TIMEOUT,
      });
      const currentLock = await env.BLOG_DATA.get(lockKey);
      if (!currentLock) {
        await env.BLOG_DATA.put(lockKey, lockValue, {
          expirationTtl: this.LOCK_TIMEOUT
        });
        return true;
      }
      const lockTimestamp = parseInt(currentLock);
      if (Date.now() - lockTimestamp > this.LOCK_TIMEOUT * 1000) {
        await env.BLOG_DATA.put(lockKey, lockValue, {
          expirationTtl: this.LOCK_TIMEOUT
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to acquire lock:", error);
      return false;
    }
  }
  static async releaseLock(scope: string, name: string): Promise<void> {
    const lockKey = `${this.LOCK_PREFIX}${scope}/${name}`;

    try {
      await env.BLOG_DATA.delete(lockKey);
    } catch (error) {
      return;
    }
  }
  static async hasLock(scope: string, name: string): Promise<boolean> {
    const lockKey = `${this.LOCK_PREFIX}${scope}/${name}`;

    try {
      const currentLock = await env.BLOG_DATA.get(lockKey);
      if (!currentLock) {
        return false;
      }
      const lockTimestamp = parseInt(currentLock);
      return Date.now() - lockTimestamp <= this.LOCK_TIMEOUT * 1000;
    } catch (error) {
      return false;
    }
  }

  /**
   * 带锁执行发布操作
   * @param scope 包的作用域
   * @param name 包名
   * @param operation 要执行的发布操作
   * @returns 操作结果
   */
  static async executeWithLock<T>(
    scope: string,
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockAcquired = await this.acquireLock(scope, name);

    if (!lockAcquired) {
      throw new Error(`Package ${scope}/${name} is currently being published by another process. Please try again later.`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(scope, name);
    }
  }
}