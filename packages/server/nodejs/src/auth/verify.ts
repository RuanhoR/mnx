/**
 * 检查字符串长度是否在指定范围内（包含边界）
 * @param str - 要检查的字符串
 * @param min - 最小长度（包含）
 * @param max - 最大长度（包含）
 * @returns 如果字符串长度在 [min, max] 范围内返回 true，否则返回 false
 */
function _lengthCheck(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}
export class Verify {
  static name(str: string): boolean {
    return typeof str == "string" && _lengthCheck(str, 1, 50) && !str.includes(String.fromCharCode(0))
  }
  static mail(str: string): boolean {
    return typeof str == "string" && _lengthCheck(str, 6, 255) && /^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$/.test(str) && !str.includes(String.fromCharCode(0))
  }
  static password(str: string) {
    return typeof str == "string" && _lengthCheck(str, 6, 50) && !str.includes(String.fromCharCode(0))
  }
}