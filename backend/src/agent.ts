import { loadEnv } from "./env";
import { searchKnowledgeBase } from "./kb";
import { tools } from "./tools";
import { triageMock } from "./triage";
import type { Category, Priority, RelatedDoc, TriageResult } from "./types";

loadEnv();

const MAX_LEN = 5000;
const MAX_TOOL_ROUNDS = 5;
const CATEGORIES: Category[] = ["bug", "feature", "question", "other"];
const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];

/**
 * 真实 Agent 入口：DeepSeek Function Calling（课程第 5、6 节），
 * 结构化输出（课程第 15、16 节），Prompt + 工具链路组装（第 17–19 节）。
 *
 * 做法：直接调 DeepSeek 的 OpenAI 兼容接口，不额外引入 LangChain 依赖，
 * 但链路与 LangChain 的 bindTools() 等价——把 tools.ts 的 4 个工具以
 * function schema 交给模型，由模型自主决定调哪个、传什么参数，
 * 后端只负责按名字分发执行（dispatch），不写死“某类工单调某工具”的 if/else。
 * 最后由模型输出 JSON，服务端校验后拼成 TriageResult。
 *
 * 没配 LLM_API_KEY 时回退 mock，响应标 source: "mock"；
 * 配了 Key 但调用失败（网络 / 401 / 超时等）时也回退 mock 并记一条不含 Key 的日志，
 * 不把失败伪装成 LLM 结果。
 */

type ChatMessage = Record<string, unknown>;

function toolDefinitions() {
  return Object.values(tools).map((t) => ({
    function: {
      description: t.description,
      name: t.name,
      parameters: t.parameters,
    },
    type: "function",
  }));
}

/** 按工具名分发执行。只做分发，不决定“该调哪个工具”——那是模型的事。 */
function executeTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "classifyTicket":
      return tools.classifyTicket.execute(String(args.text ?? ""));
    case "searchKnowledgeBase":
      return tools.searchKnowledgeBase.execute(String(args.text ?? ""));
    case "generateAcceptanceChecklist":
      return tools.generateAcceptanceChecklist.execute(args.category as Category);
    case "assignOwner":
      return tools.assignOwner.execute(String(args.text ?? ""));
    default:
      throw new Error(`未知工具: ${name}`);
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function callDeepSeek(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages,
        model,
        temperature: 0.2,
        // deepseek-chat 默认会在调工具前做长思考，一次调用曾耗时 114 秒；
        // 分诊不需要思考过程，关掉后同等调用约 1.5 秒。
        thinking: { type: "disabled" },
        tools: toolDefinitions(),
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DeepSeek 返回 ${res.status}: ${detail.slice(0, 200)}`);
    }
    return (await res.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

export async function runAgent(rawText: string): Promise<TriageResult> {
  const truncated = rawText.length > MAX_LEN;
  const text = truncated ? rawText.slice(0, MAX_LEN) : rawText;
  const apiKey = process.env.LLM_API_KEY?.trim() ?? "";
  // 注意：triageMock 收到的是已截断的 text，自己算不出 truncated，
  // 所以回退路径要把外层算好的 truncated 补回去。
  if (!apiKey) return { ...triageMock(text), truncated };

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.LLM_MODEL || "deepseek-chat";

  const messages: ChatMessage[] = [
    {
      content:
        "你是工单分诊助手。收到一段工单/需求文本后，先用提供的工具完成分诊：\n" +
        "1. 一次并行调用 classifyTicket（判断分类、优先级和建议负责人）和 searchKnowledgeBase（检索相似历史工单）；\n" +
        "2. 再按分类调 generateAcceptanceChecklist 生成验收清单。\n" +
        "工具返回后，只输出一个 JSON 对象，不要输出其他文字，字段如下：\n" +
        '{"category":"bug|feature|question|other","priority":"P0|P1|P2|P3",' +
        '"assignee":"建议负责人小组","summary":"一句话摘要（不超过60字）",' +
        '"steps":["处理步骤1","处理步骤2","处理步骤3"]}\n' +
        "优先级口径：影响付费/登录等核心功能且无法使用为 P0/P1，一般 Bug 为 P1，需求为 P2，一般咨询为 P3。",
      role: "system",
    },
    { content: text, role: "user" },
  ];

  try {
    const toolCallsUsed: string[] = [];
    let lastChecklist: string[] | null = null;
    let lastRelatedDocs: RelatedDoc[] | null = null;
    let finalJson: Record<string, unknown> | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const body = await callDeepSeek(apiKey, baseUrl, model, messages);
      const choice = (body.choices as Record<string, unknown>[] | undefined)?.[0];
      const message = (choice?.message ?? {}) as Record<string, unknown>;
      // DeepSeek 要求回传的消息必须带 content 字符串字段：模型只调工具不说话时
      // content 可能是 null 或缺失，直接回传会在下一轮报 422；这里统一补成 ""，
      // 并去掉 reasoning_content（回传它也会被拒）。
      const { reasoning_content: _reasoning, ...rest } = message;
      messages.push({ ...rest, content: typeof message.content === "string" ? message.content : "" });

      const toolCalls = (message.tool_calls ?? []) as Record<string, unknown>[];
      if (toolCalls.length === 0) {
        finalJson = extractJson(String(message.content ?? ""));
        break;
      }

      for (const call of toolCalls) {
        const fn = (call.function ?? {}) as Record<string, unknown>;
        const name = String(fn.name ?? "");
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(String(fn.arguments ?? "{}")) as Record<string, unknown>;
        } catch {
          args = {};
        }
        toolCallsUsed.push(name);
        let result: unknown;
        try {
          result = executeTool(name, args);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "工具执行失败" };
        }
        if (name === "generateAcceptanceChecklist" && Array.isArray(result)) {
          lastChecklist = result as string[];
        }
        if (name === "searchKnowledgeBase" && Array.isArray(result)) {
          lastRelatedDocs = result as RelatedDoc[];
        }
        messages.push({
          content: JSON.stringify(result),
          role: "tool",
          tool_call_id: String(call.id ?? ""),
        });
      }
    }

    if (!finalJson) {
      throw new Error("模型未返回结构化 JSON");
    }

    const category = CATEGORIES.includes(finalJson.category as Category)
      ? (finalJson.category as Category)
      : "other";
    const priority = PRIORITIES.includes(finalJson.priority as Priority)
      ? (finalJson.priority as Priority)
      : "P3";
    const assignee =
      typeof finalJson.assignee === "string" && finalJson.assignee.trim()
        ? finalJson.assignee.trim()
        : triageMock(text).assignee;
    const summary =
      typeof finalJson.summary === "string" && finalJson.summary.trim()
        ? finalJson.summary.trim().slice(0, 60)
        : text.slice(0, 60);
    const steps = Array.isArray(finalJson.steps)
      ? (finalJson.steps as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6)
      : [];

    return {
      assignee,
      category,
      checklist: lastChecklist ?? tools.generateAcceptanceChecklist.execute(category),
      priority,
      relatedDocs: lastRelatedDocs ?? searchKnowledgeBase(text),
      source: "llm",
      steps: steps.length > 0 ? steps : ["1. 分类与定级（LLM Tool Calling）", "2. 检索知识库，找相似工单", `3. 指派给${assignee}`, "4. 按验收清单逐项确认后关闭"],
      summary,
      toolCalls: [...new Set(toolCallsUsed)],
      truncated,
    };
  } catch (err) {
    // 失败不伪装：记一条不含 Key 的日志，回退 mock。
    console.error("LLM 分诊失败，回退 mock:", err instanceof Error ? err.message : err);
    return { ...triageMock(text), truncated };
  }
}
