import cors from "cors";
import express from "express";
import { runAgent } from "./agent";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/triage", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "请先输入工单内容" });
  try {
    const result = await runAgent(text);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "分诊失败，请稍后重试" });
  }
});

app.listen(PORT, () => console.log(`triage backend listening on http://localhost:${PORT}`));
