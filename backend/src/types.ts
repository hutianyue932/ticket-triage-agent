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
}

export interface TriageRequest {
  text: string;
}
