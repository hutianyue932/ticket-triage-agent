import { useState } from "react";
import { triage } from "./api";
import { CATEGORY_LABEL, type TriageResult } from "./types";

const SAMPLES = [
  "用户反馈登录时收不到短信验证码，已经重发了三次还是没有",
  "希望新增批量导出报表功能，可以按月导出 PDF",
  "请问申请退款后多久到账？在哪里查看退款进度？",
];

interface HistoryItem {
  id: number;
  input: string;
  result: TriageResult;
}

export default function App() {
  const [text, setText] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = history.find((h) => h.id === selectedId) ?? null;

  async function handleSubmit() {
    if (!text.trim()) {
      setError("请先输入工单内容");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await triage(text);
      const item: HistoryItem = { id: Date.now(), input: text, result };
      setHistory((prev) => [item, ...prev]);
      setSelectedId(item.id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "请求失败。请确认后端已启动：cd backend && npm run dev（端口 3001）"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>需求 / 工单分诊 Agent</h1>
        <p className="sub">
          MVP 骨架：当前为 <strong>mock 分诊</strong>（规则命中，未接大模型），用于跑通前后端与展示链路。
          下一步接 LangChain Tool Calling（课程第 5、6 节）。
        </p>
      </header>

      <section className="panel">
        <label htmlFor="ticket-input">工单 / 需求文本</label>
        <textarea
          id="ticket-input"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如：用户反馈登录时收不到短信验证码…"
        />
        <div className="samples">
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => setText(s)}>
              示例：{s.slice(0, 18)}…
            </button>
          ))}
        </div>
        <div className="actions">
          <button type="button" onClick={handleSubmit} disabled={loading}>
            {loading ? "分诊中…" : "开始分诊"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setText("");
              setError("");
            }}
          >
            清空
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <div className="layout">
        <section className="panel">
          <h2>分诊结果（{history.length}）</h2>
          {history.length === 0 && <p className="muted">暂无结果，提交一条工单试试。</p>}
          <ul className="list">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === selectedId ? "item active" : "item"}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={`badge ${item.result.priority}`}>{item.result.priority}</span>
                  <span className="tag">{CATEGORY_LABEL[item.result.category]}</span>
                  <span className="summary">{item.result.summary}</span>
                  <span className="assignee">{item.result.assignee}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>详情</h2>
          {!selected && <p className="muted">点左侧一条结果查看详情。</p>}
          {selected && (
            <div>
              <p>
                <strong>分类：</strong>
                {CATEGORY_LABEL[selected.result.category]} ｜ <strong>优先级：</strong>
                {selected.result.priority} ｜ <strong>建议负责人：</strong>
                {selected.result.assignee} ｜ <strong>来源：</strong>
                {selected.result.source}
                {selected.result.truncated ? "（文本过长已截断）" : ""}
              </p>
              <p className="muted">原文：{selected.input}</p>
              <h3>处理步骤</h3>
              <ol>
                {selected.result.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <h3>验收清单</h3>
              <ul>
                {selected.result.checklist.map((c) => (
                  <li key={c}>
                    <label>
                      <input type="checkbox" /> {c}
                    </label>
                  </li>
                ))}
              </ul>
              <h3>关联知识库文档</h3>
              {selected.result.relatedDocs.length === 0 ? (
                <p className="muted">未命中相关文档。</p>
              ) : (
                <ul>
                  {selected.result.relatedDocs.map((d) => (
                    <li key={d.id}>
                      {d.id} · {d.title}（命中 {d.score} 个关键词）
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
