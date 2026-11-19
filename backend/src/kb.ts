import { readFileSync } from "fs";
import { join } from "path";
import type { Category, RelatedDoc } from "./types";

interface KbEntry {
  id: string;
  title: string;
  category: Category;
  keywords: string[];
  body: string;
}

const kb: KbEntry[] = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "data", "tickets.json"), "utf-8")
);

/** 简单关键词检索占位（课程第 9、10 节的简化版：先关键词，再上向量 RAG）。 */
export function searchKnowledgeBase(text: string, limit = 3): RelatedDoc[] {
  const lower = text.toLowerCase();
  return kb
    .map((entry) => {
      const score = entry.keywords.filter((k) => lower.includes(k.toLowerCase())).length;
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, score }) => ({
      category: entry.category,
      id: entry.id,
      score,
      title: entry.title,
    }));
}
