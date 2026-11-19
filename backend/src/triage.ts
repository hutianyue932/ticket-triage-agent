import { searchKnowledgeBase } from "./kb";
import type { Category, Priority, TriageResult } from "./types";

const MAX_LEN = 5000;

// Mock 分诊规则：关键词命中，可解释、可测试。不是大模型结果，响应里会标 source: "mock"。
// 下一步（课程第 5、6、15 节）：把这里换成 LangChain Tool Calling + output parser，见 tools.ts / agent.ts。
const RULES: { keywords: string[]; category: Category; priority: Priority; assignee: string }[] = [
  {
    assignee: "支付组",
    category: "bug",
    keywords: ["支付失败", "扣款", "退款", "付款", "pay"],
    priority: "P0",
  },
  {
    assignee: "账号组",
    category: "bug",
    keywords: ["登录", "验证码", "收不到", "无法登录", "密码", "账号"],
    priority: "P1",
  },
  {
    assignee: "上传组",
    category: "bug",
    keywords: ["上传失败", "大文件", "上传", "卡住", "超时"],
    priority: "P1",
  },
  {
    assignee: "前端组",
    category: "bug",
    keywords: ["崩溃", "白屏", "闪退", "报错", "打不开", "加载失败"],
    priority: "P1",
  },
  {
    assignee: "产品组",
    category: "feature",
    keywords: ["新增", "希望", "建议", "能否", "想要", "优化", "支持"],
    priority: "P2",
  },
  {
    assignee: "客服组",
    category: "question",
    keywords: ["怎么", "如何", "为什么", "请问", "咨询", "在哪里"],
    priority: "P3",
  },
];

const CHECKLISTS: Record<Category, string[]> = {
  bug: ["复现步骤是否完整", "影响范围与用户数是否确认", "是否有报错截图 / 日志", "回归测试用例是否补充"],
  feature: ["需求背景与目标用户是否明确", "验收标准是否可测试", "是否评估对现有功能的影响"],
  other: ["是否需要人工再确认分类", "是否补充缺失的关键信息"],
  question: ["是否已查知识库并引用对应文档", "回答后是否需要跟进确认"],
};

const BUG_SIGNALS = ["失败", "崩溃", "白屏", "闪退", "无法", "收不到", "卡住", "打不开", "扣款"];

export function triageMock(rawText: string): TriageResult {
  const truncated = rawText.length > MAX_LEN;
  const text = truncated ? rawText.slice(0, MAX_LEN) : rawText;
  // 咨询句式（请问/怎么/如何/多久）优先于支付等关键词，除非带明确故障信号词（如“支付失败”）。
  const isQuestion = ["怎么", "如何", "为什么", "请问", "咨询", "在哪里", "多久"].some((k) => text.includes(k));
  const hasBugSignal = BUG_SIGNALS.some((k) => text.includes(k));
  const rule =
    (isQuestion && !hasBugSignal
      ? RULES.find((r) => r.category === "question")
      : RULES.find((r) => r.keywords.some((k) => text.includes(k)))) ?? {
      assignee: "通用组",
      category: "other" as Category,
      priority: "P3" as Priority,
    };
  return {
    assignee: rule.assignee,
    category: rule.category,
    checklist: CHECKLISTS[rule.category],
    priority: rule.priority,
    relatedDocs: searchKnowledgeBase(text),
    source: "mock",
    steps: [
      "1. 分类与定级（mock 规则命中）",
      "2. 检索知识库，找相似工单",
      `3. 指派给${rule.assignee}`,
      "4. 按验收清单逐项确认后关闭",
    ],
    summary: text.length > 60 ? `${text.slice(0, 60)}…` : text,
    truncated,
  };
}
