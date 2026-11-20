/** ドメイン直下でもサブフォルダでも同じ相対パスで静的ファイルを指す */
export function publicUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const base = import.meta.env.BASE_URL || './'
  const clean = path.replace(/^(\.\/|\/)+/, '')
  return base + clean
}
