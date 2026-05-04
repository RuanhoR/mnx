export class KvManger {
  static set(key: KvKeys, value: string) {
    return localStorage.setItem(key, value)
  }
  static get(key: KvKeys) {
    return localStorage.getItem(key)
  }
  static rm(key: KvKeys) {
    return localStorage.removeItem(key)
  }
  static setCache<T = unknown>(key: string, value: T, expirationMinutes: number = 5) {
    const cacheData = {
      value: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + (expirationMinutes * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  }

  static getCache<T = unknown>(key: string): T | null {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    try {
      const cacheData = JSON.parse(cached);
      if (Date.now() > cacheData.expiresAt) {
        this.rmCache(key);
        return null;
      }
      return cacheData.value;
    } catch {
      return null;
    }
  }

  static rmCache(key: string) {
    localStorage.removeItem(key);
  }

  static clearExpiredCache() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            if (Date.now() > cacheData.expiresAt) {
              localStorage.removeItem(key);
            }
          } catch {
            // 忽略无效的缓存数据
          }
        }
      }
    });
  }
}

export enum KvKeys {
  token = "token",
  tmpVerifyURL = "tmp_verify_url_che"
}

// 缓存键名常量
export const CacheKeys = {
  packageInfo: (scope: string, name: string) => `cache_package_${scope}_${name}`,
  packageVersions: (scope: string, name: string) => `cache_versions_${scope}_${name}`
};