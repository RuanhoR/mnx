/**
 * PBKDF2-SHA256 加盐哈希函数
 * @param {string} value - 要哈希的字符串
 * @param {string} salt - 盐值字符串
 * @param {number} iteration - 迭代次数，默认 10000
 * @param {number} keyLength - 密钥长度（比特），如 256
 * @returns {Promise<string>} 十六进制哈希值
 */
export async function hashWithSalt(
  value: string,
  salt: string,
  iteration: number = 10000,
  keyLength: number = 256
): Promise<string> {
  const encoder = new TextEncoder();
  const valueBuffer = encoder.encode(value);
  const saltBuffer = encoder.encode(salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    valueBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iteration,
      hash: 'SHA-256'
    },
    keyMaterial,
    keyLength // 密钥长度（比特）
  );
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
export function ramdonValue() {
  return (function () {
    const a = new Uint32Array(1);
    return crypto.getRandomValues(a)
  })()[0].toString(16)
}