# ticket-triage-agent — 需求 / 工单分诊 Agent Demo（MVP 骨架）

> 目标：一个能跑通、能部署、能上 GitHub、能演示的分诊 Agent。
> 定位：高级前端 + TS 全栈交付 + AI 工作流的作品集项目。前端用 React（补 React 能力），后端用 Node.js + TypeScript（不写完整复杂业务，先搭架子）。
> 课程按《转型 agent 全栈工程师：企业级知识库项目》当作全没学过，对照表见 `docs/course-mapping.md`（本仓库外的对照表在 `workspace/goals/goal/files/demo-course-mapping.md`）。

## 这是什么

用户粘贴一段需求 / 工单文本（Bug、需求、咨询），Agent 分诊后返回：

- **分类**：bug / feature / question / other
- **优先级**：P0 / P1 / P2 / P3
- **建议负责人**：按关键词路由到对应小组（账号、支付、上传、通用）
- **验收清单**：按分类生成的检查项
- **关联知识库文档**：从本地 `data/` 做简单关键词检索命中

## MVP 范围（本提交已有的）

- ✅ 前端：Vite + React + TypeScript，输入框、提交、分诊结果列表、详情面板
- ✅ 后端：Node.js + TypeScript + Express，`POST /api/triage`，mock 分诊逻辑占位
- ✅ 知识库：`data/tickets.json`，15 条虚构通用工单，简单关键词检索占位（不是真实公司数据）
- ✅ 已接真实大模型：DeepSeek（deepseek-chat）Function Calling，`backend/src/agent.ts`，
  模型自主调用 tools.ts 的 4 个工具，结构化输出分诊结果；未配 Key 时回退 mock
- ❌ 未做：RAG 向量检索、SSE 流式、MCP、LangGraph、Docker、RBAC、鉴权

## 怎么跑（本地）

需要 Node.js 18+。

```bash
# 1. 后端（端口 3001）
cd backend
npm install
npm run dev        # tsx watch 模式；或 npm run build && npm start

# 2. 前端（端口 5173，会代理 /api 到 localhost:3001）
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173 ，粘贴一段工单文本（页面有 3 条示例，一键填入），点“开始分诊”，看结果列表，点一条看详情面板。

健康检查：`GET http://localhost:3001/health` 返回 `{"ok":true}`。

## 环境变量

后端默认用 mock（不配 Key）。接 DeepSeek 时复制：

```bash
cp backend/.env.example backend/.env
# 填 LLM_API_KEY、LLM_BASE_URL（默认 https://api.deepseek.com）、LLM_MODEL（默认 deepseek-chat），不要提交 .env
```

配了 Key 后 `POST /api/triage` 返回 `source: "llm"`，并在 `toolCalls` 里列出模型实际调过的工具名；
未配 Key 或调用失败时回退 mock，返回 `source: "mock"`，不伪装成大模型结果。

## 后续要加的（按课程章节）

| 下一步 | 课程章节 | 说明 |
|---|---|---|
| 接大模型 API + Tool Calling，替换 mock | 第 5、6 节（Tool / mini cursor） | ✅ 已完成：DeepSeek 原生 Function Calling（与 LangChain bindTools() 等价链路，未引入 LangChain 依赖），见 `backend/src/agent.ts` |
| 结构化输出分诊结果 | 第 15、16 节（output parser） | ✅ 已完成：模型只输出 JSON，服务端校验字段后拼成 TriageResult（未引入 parser 库，先用 JSON 提取 + 校验） |
| Prompt 与链路组装 | 第 17、18、19 节（Prompt Template / Runnable / LCEL） | 把分诊拆成 prompt → tools → parser 的 chain |
| 真正的 RAG | 第 9、10、11 节（RAG / loader / splitter），再看第 12、13 节（Milvus） | 先做文档切分 + 关键词检索，再上向量库 |
| SSE 流式 | 第 21 节（Nest + LangChain SSE），第 63 节（SSE 流式 UI） | 后端先出 SSE，前端再做流式渲染 |
| MCP | 第 7、8 节 | 把工具暴露为 MCP Server |
| 多 Agent / 自主决策 | 第 26、27 节（LangGraph / Agentic RAG） | 分诊 → 检索 → 复核拆成多节点 |
| 评估与观测 | 第 32 节（LangSmith）、第 68 节（LangFuse） | 评测集 + tracing，别靠感觉 |
| 部署 | 第 28 节（Docker Compose） | 前后端分开部署再说 |

## 目录结构

```
ticket-triage-agent/
  frontend/            # Vite + React + TS
    src/App.tsx        # 输入 + 结果列表 + 详情面板
    src/api.ts         # 调 /api/triage
    src/types.ts
  backend/             # Node + TS + Express
    src/index.ts       # HTTP 入口，POST /api/triage, GET /health
    src/triage.ts      # mock 分诊规则（占位）
    src/tools.ts       # 工具定义：分类 / 检索 / 验收清单 / 指派（留 LangChain 接入点）
    src/kb.ts          # 本地知识库关键词检索
    src/agent.ts       # runAgent() 占位：下一步接 LangChain
  data/tickets.json    # 15 条虚构示例工单（通用场景，无真实公司数据）
  docs/openspec.md     # 需求拆解 + 验收清单（OpenSpec/STDD 风格）
```

## 验收（MVP）

见 `docs/openspec.md`。核心三条：前后端都能 `npm run dev` 跑起来；提交工单能返回结构化分诊结果；`npm run build` 通过、无 `.env` / API Key / `node_modules` 被提交。
