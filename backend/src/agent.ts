import { triageMock } from "./triage";
import type { TriageResult } from "./types";

/**
 * Agent 入口占位。MVP 先走 mock，链路已通。
 *
 * TODO（下一步，课程第 5、6、15、17–19 节）：
 *  1. 读 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL，接大模型；
 *  2. 把 tools.ts 的 4 个工具用 LangChain 的 bindTools() 交给模型自主调用；
 *  3. 用 output parser 把模型输出解析成 TriageResult（结构化输出，第 15、16 节）；
 *  4. 用 Prompt Template + Runnable/LCEL 把“分类 → 检索 → 验收清单”组装成 chain（第 17–19 节）；
 *  5. 跑通后把 source 从 "mock" 改成 "llm"，并在 README 的验收里补一条真实调用记录。
 * 在此之前不要声称这是 AI 分诊——前端与响应都明确标注 mock。
 */
export async function runAgent(text: string): Promise<TriageResult> {
  // TODO: 接 LangChain 后替换为真实 Agent 调用。
  return triageMock(text);
}
