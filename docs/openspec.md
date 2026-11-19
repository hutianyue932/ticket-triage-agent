# OpenSpec：需求 / 工单分诊 Agent Demo（MVP）

> 风格：OpenSpec / STDD——先写目标、范围、验收，再写代码。课程对照见 README 与 `workspace/goals/goal/files/demo-course-mapping.md`。

## 目标

做一个能演示的分诊 Agent，证明三件事（对应求职目标 23.66 万+ 的「高级前端 + TS 全栈交付 + AI 工作流」）：

1. 能用 React 写出可用的前端（补 React 能力，之前只有一页经验）。
2. 能用 Node.js + TypeScript 独立交付后端接口。
3. 真的动手做过 Agent 链路：工具定义 → 调用 → 结构化输出 → 知识库检索（已接 DeepSeek
   Function Calling，见 `backend/src/agent.ts`）。

## 范围（MVP 做什么 / 不做什么）

做：
- 前端输入工单文本 → 提交 → 展示分诊结果列表 → 点一条看详情（分类、优先级、负责人、验收清单、关联文档）。
- 后端 `POST /api/triage` 返回结构化 JSON；`GET /health` 健康检查。
- 本地知识库 15 条虚构工单，关键词检索。
- 工具定义 4 个（分类、检索、验收清单、指派），留 LangChain 接入点。

不做（之后，按课程章节再加）：
- 不做向量 RAG / Milvus（课程第 9–13 节）。
- 不做 SSE 流式（课程第 21、63 节）。
- 不做 MCP / LangGraph / Docker / RBAC / 鉴权。
- 不用任何真实公司数据（`data/` 全是虚构通用工单）。

## 需求拆解

| # | 需求 | 验收 |
|---|---|---|
| 1 | 前端：输入框 + 提交 + 示例一键填入 | 能输入、能清空、3 条示例可一键填入 |
| 2 | 前端：结果列表 | 每条显示分类、优先级、标题摘要、负责人 |
| 3 | 前端：详情面板 | 点一条，右侧/下方显示验收清单 + 关联知识库文档 + 处理步骤 |
| 4 | 后端：`POST /api/triage` | 入参 `{ text }`，出参 `{ category, priority, assignee, checklist, relatedDocs, steps }`，空文本返回 400 |
| 5 | 后端：mock 分诊规则可解释 | 关键词命中逻辑写在 `triage.ts`，有注释，不伪装成大模型结果；响应里 `source: "mock"` |
| 6 | 知识库：关键词检索 | `data/tickets.json` 15 条，命中按关键词重叠度排序，最多返回 3 条 |
| 7 | 工具调用 | `tools.ts` 有 4 个工具的 schema + 本地实现；`agent.ts` 把 4 个工具交给 DeepSeek 自主调用（Function Calling，课程第 5、6 节），`toolCalls` 记录实际调用 |
| 8 | 可构建、可运行 | 前后端 `npm run build` 通过；`npm run dev` 都能跑；README 的命令能照抄跑通 |
| 9 | 干净提交 | 不含 `node_modules/`、`.env`、API Key；有 `.gitignore`、`.env.example` |
| 10 | 真实分诊 | 配了 Key 时返回 `source: "llm"` 且 `toolCalls` 非空；未配 Key 时返回 `source: "mock"`；调用失败回退 mock，不伪装 |

## 边界与异常分支

- 空文本 / 只有空白：后端 400，前端提示“请先输入工单内容”。
- 超长文本（> 5000 字）：后端截断到 5000 字再分诊，并在响应里注明 `truncated: true`。
- 后端挂了：前端显示“后端未启动，请先在 backend 跑 npm run dev（端口 3001）”。
- 无法分类：默认 `category: "other"`、`priority: "P3"`，不编造高优先级。
- Mock 阶段不声称是 AI 分诊：前端与响应都标注 `mock`，接大模型后再去掉。

## 验收清单（提交前逐项打勾）

- [ ] `cd backend && npm install && npm run build` 通过
- [ ] `cd frontend && npm install && npm run build` 通过
- [ ] 后端 `npm run dev` 后 `curl localhost:3001/health` 返回 `{"ok":true}`
- [ ] `curl -X POST localhost:3001/api/triage -d '{"text":"用户反馈登录时收不到短信验证码"}'` 返回结构化 JSON，含 category/priority/assignee/checklist
- [ ] 前端 `npm run dev` 打开 http://localhost:5173，提交示例工单能看到结果列表与详情
- [ ] `git status` 干净提交里没有 `node_modules`、`.env`、API Key
