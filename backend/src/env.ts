import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * 极简 .env 加载（不引入 dotenv 依赖）。
 * 只填充 process.env 里还没有的变量，绝不覆盖已有的环境变量，
 * 也绝不在日志里输出任何变量值（API Key 只进内存，不打印）。
 */
export function loadEnv(): void {
  const envPath = join(__dirname, "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
