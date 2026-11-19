import { searchKnowledgeBase } from "./kb";
import { triageMock } from "./triage";
import type { Category, TriageResult } from "./types";

/**
 * 工具定义（课程第 5、6 节：从 Tool 开始 / mini cursor）。
 *
 * 每个工具都有名字、描述、参数 schema 和本地实现。
 * 下一步接 LangChain 时，把这 4 个工具通过 `bindTools()` / Tool Calling 交给大模型
 * 自主选择调用（不要把工具调用写死在 if/else 里），结构化输出见课程第 15、16 节。
 * 现在先由 triage.ts 的 mock 规则直接调用它们，保证链路可跑通、可测试。
 */
export const tools = {
  /** 分类 + 定优先级 + 指派负责人。 */
  classifyTicket: {
    description: "根据工单文本判断分类、优先级和建议负责人",
    execute: (text: string): Pick<TriageResult, "assignee" | "category" | "priority"> => {
      const r = triageMock(text);
      return { assignee: r.assignee, category: r.category, priority: r.priority };
    },
    name: "classifyTicket",
    parameters: {
      properties: { text: { description: "工单原文", type: "string" } },
      required: ["text"],
      type: "object",
    },
  },

  /** 查本地知识库，返回相似工单。 */
  searchKnowledgeBase: {
    description: "在本地知识库中检索与工单相似的历史工单",
    execute: (text: string) => searchKnowledgeBase(text),
    name: "searchKnowledgeBase",
    parameters: {
      properties: { text: { description: "工单原文", type: "string" } },
      required: ["text"],
      type: "object",
    },
  },

  /** 按分类生成验收清单。 */
  generateAcceptanceChecklist: {
    description: "按分类生成验收清单",
    execute: (category: Category): string[] => {
      const lists: Record<Category, string[]> = {
        bug: ["复现步骤是否完整", "影响范围是否确认", "是否有报错截图 / 日志"],
        feature: ["需求背景是否明确", "验收标准是否可测试"],
        other: ["是否需要人工再确认分类"],
        question: ["是否已查知识库并引用对应文档"],
      };
      return lists[category];
    },
    name: "generateAcceptanceChecklist",
    parameters: {
      properties: {
        category: { description: "分类", enum: ["bug", "feature", "question", "other"], type: "string" },
      },
      required: ["category"],
      type: "object",
    },
  },

  /** 指派负责人（按规则路由，LLM 接入后可改为模型决策）。 */
  assignOwner: {
    description: "按分类与关键词把工单指派给对应小组",
    execute: (text: string): string => triageMock(text).assignee,
    name: "assignOwner",
    parameters: {
      properties: { text: { description: "工单原文", type: "string" } },
      required: ["text"],
      type: "object",
    },
  },
};

export type ToolName = keyof typeof tools;
