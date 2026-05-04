import { env } from "cloudflare:workers";

export class KVLockManager {
  private static readonly LOCK_PREFIX = "publish-lock:";
  private static readonly LOCK_TIMEOUT = 300;
  private static normalizeScope(scope: string): string {
    return scope.startsWith("@") ? scope.slice(1) : scope;
  }
  private static getLockKey(scope: string, name: string): string {
    return `${this.LOCK_PREFIX}${this.normalizeScope(scope)}/${name}`;
  }
  private static parseLockTimestamp(raw: string): number {
    const asNumber = Number.parseInt(raw, 10);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
    try {
      const parsed = JSON.parse(raw) as { timestamp?: number };
      if (parsed && typeof parsed.timestamp === "number" && Number.isFinite(parsed.timestamp)) {
        return parsed.timestamp;
      }
    } catch {
      return 0;
    }
    return 0;
  }
  static async acquireLock(scope: string, name: string): Promise<boolean> {
    const lockKey = this.getLockKey(scope, name);
    const now = Date.now();
    const lockValue = JSON.stringify({
      id: crypto.randomUUID(),
      timestamp: now
    });
    try {
      const currentLock = await env.BLOG_DATA.get(lockKey);
      if (currentLock) {
        const lockTimestamp = this.parseLockTimestamp(currentLock);
        if (now - lockTimestamp <= this.LOCK_TIMEOUT * 1000) {
          return false;
        }
      }

      await env.BLOG_DATA.put(lockKey, lockValue, {
        expirationTtl: this.LOCK_TIMEOUT,
      });
      const verifyLock = await env.BLOG_DATA.get(lockKey);
      return verifyLock === lockValue;
    } catch (error) {
      console.error("Failed to acquire lock:", error);
      return false;
    }
  }
  static async releaseLock(scope: string, name: string): Promise<void> {
    const lockKey = this.getLockKey(scope, name);

    try {
      await env.BLOG_DATA.delete(lockKey);
    } catch (error) {
      return;
    }
  }
  static async hasLock(scope: string, name: string): Promise<boolean> {
    const lockKey = this.getLockKey(scope, name);

    try {
      const currentLock = await env.BLOG_DATA.get(lockKey);
      if (!currentLock) {
        return false;
      }
      const lockTimestamp = this.parseLockTimestamp(currentLock);
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
