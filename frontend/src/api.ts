import type { TriageResult } from "./types";

export async function triage(text: string): Promise<TriageResult> {
  const res = await fetch("/api/triage", {
    body: JSON.stringify({ text }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `请求失败（${res.status}）`);
  }
  return (await res.json()) as TriageResult;
}
