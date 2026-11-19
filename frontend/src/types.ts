export type Category = "bug" | "feature" | "question" | "other";
export type Priority = "P0" | "P1" | "P2" | "P3";

export interface RelatedDoc {
  id: string;
  title: string;
  category: Category;
  score: number;
}

export interface TriageResult {
  assignee: string;
  category: Category;
  checklist: string[];
  priority: Priority;
  relatedDocs: RelatedDoc[];
  source: "mock" | "llm";
  steps: string[];
  summary: string;
  truncated: boolean;
  /** 模型实际调用过的工具名（按调用顺序去重），mock 模式下为空。 */
  toolCalls?: string[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  bug: "Bug",
  feature: "需求",
  other: "其他",
  question: "咨询",
};
