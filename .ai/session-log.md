# AI Session Log

每轮 Goal 结束时，把最新记录追加到顶部。记录要短，但足够让下一轮恢复现场。

## 2026-06-26 - RAI-012 WorkspacePanel 拆分闭环

目标：降低 `WorkspacePanel.vue` 继续承载所有工作台路由的回归风险，先抽出一个低风险路由级面板，并保持用户可见行为不变。

已完成：

- `code/front/src/components/workspace/WorkspaceHistoryPanel.vue`：新增 History 路由子面板，承接提交记录列表、活动文案、相对时间、短 hash 和空状态。
- `code/front/src/components/WorkspacePanel.vue`：移除 History 专属 activity computed 和 formatter，改为向 `WorkspaceHistoryPanel` 传入 `store.activeDocument.title`、`store.activityLog`，并转发完整记录导航事件；保留原隐藏 AI/JD 代码不做范围外清理。
- `.ai/backlog.md`：将 `RAI-012` 标为 Done，并把下一轮建议更新为继续拆 Settings 或登记新的 P1/P2 切片。

验证：

- 基线确认：`WorkspacePanel.vue` 共有 2268 行，History 区块只依赖活动日志、当前简历标题和 3 个格式化函数，属于最低风险拆分点。
- 拆分后：`WorkspacePanel.vue` 下降到 2233 行，`WorkspaceHistoryPanel.vue` 为 66 行。
- `cd code/front && npm run test`：24 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 要求和 PDF chunk 超 500 kB 警告。
- Browser 桌面验收：`http://127.0.0.1:5173/#history` 显示 27 条提交记录，空态未误显示，`bodyScrollWidth=1280` 与 1280px 视口一致。
- Browser 390px 验收：`bodyScrollWidth=390`，无横向溢出；当前 History 路由内容宽度为 0，说明窄屏下这一路由仍受既有响应式策略限制，本轮不扩大为移动布局修复。

风险和下一步：

- 本轮是架构拆分，不新增产品能力；主要价值是减少后续继续改工作台时的回归面。
- 390px History 内容不可见但不溢出，建议后续作为单独响应式问题处理，或沿用 RAI-009 的明确支持提示策略。
- 下一轮若继续做架构，优先抽 `SettingsPanel`；如果回到体验价值，可新增 backlog 切片。

## 2026-06-25 - RAI-010 管理端真实数据入口闭环

目标：让超管在管理端平台 API 页面看到来自后端的真实请求记录，且失败调用有可扫描的失败状态和原因，而不是只能看静态面板或展开后猜问题。

已完成：

- `code/backend/src/app.ts`：平台草稿请求在通过认证后，如果 quota、rate limit、payload validation、生成或持久化失败，会写入 `status: failed` 的平台请求日志，并保留 `requestId`、`userId`、client、route、latency 和错误原因；原 API 错误继续按原状态返回。
- `code/backend/src/store.mjs`：失败的平台请求活动日志不再写成“Generated platform draft”，改为平台草稿失败事件，`meta` 保存失败原因。
- `code/backend/test/app.test.ts`：补充 invalid payload 和 quota 失败日志断言；验证 `/api/v1/platform/requests` 与 `/api/admin/state` 都能读到 `status=failed` 和 error，client summary 的失败计数同步增加。
- `code/admin/src/App.tsx`：确认现有平台 API 页已经从后端 state 映射请求日志，并在 expandable 详情里展示 `Error` 字段；本轮没有新增管理端 UI diff。
- `.ai/backlog.md`：将 `RAI-010` 标为 Done，下一轮推荐更新为 `RAI-012`。

验证：

- 基线确认：管理端已有 admin token 登录、`/api/admin/state`、`/api/admin/platform-clients`、平台请求表格和 expandable 详情；缺口是后端不会记录认证后失败的平台请求，管理端主表也没有直接显示失败原因。
- `cd code/backend && npm run test`：15 个测试通过。
- `cd code/backend && npm run typecheck`：通过。
- `cd code/backend && npm run build`：通过。
- `cd code/admin && npm run typecheck`：通过。
- `cd code/admin && npm run build`：通过；仍有既有 Ant Design/Vite chunk 超 500 kB 警告。
- 浏览器验收未完成：沙箱阻止本地监听 `127.0.0.1:8787` 和 `tsx` IPC；尝试提升权限启动真实后端和无敏感 token 的本地 mock admin API 均被审批拒绝。未继续绕过。

风险和下一步：

- 本轮没有实际浏览器点击 S7；当前证据来自后端 API 测试、admin state 断言、管理端 typecheck/build 和源码检查。用户允许本地服务后，应补一次管理端浏览器验收：登录 `owner-token`，打开平台 API 页，展开 `futurehire-2` failed 行，确认 Error 为 `Platform API daily quota exceeded`。
- 下一轮建议做 `RAI-012`，先抽出 `WorkspacePanel` 的 History 或 Settings 面板，降低后续维护成本。

## 2026-06-17 - RAI-011 平台 API 文档闭环

目标：让外部开发者不必翻源码，也能按官方文档完成草稿 API 接入，并让 OpenAPI 契约测试守住认证、请求、响应、错误码、日志和幂等说明。

已完成：

- `code/backend/src/app.ts`：`/api/v1/openapi.json` 从路径级草案升级为带 request/response/error/log schema 的 OpenAPI 3.1 文档；补充 tags、认证说明、错误码扩展和幂等说明。
- `code/backend/test/app.test.ts`：增强平台 API 契约测试，断言草稿请求体、201 响应、400 错误体、请求日志列表和关键 schema 字段都存在。
- `docs/platform-api.md`：新增外部开发者接入文档，覆盖 base URL、认证、scope、curl 示例、请求字段、响应结构、错误码、幂等和请求日志。
- `README.md`、`code/backend/README.md`：增加平台 API 文档和 OpenAPI 入口链接。
- `.ai/backlog.md`：将 `RAI-011` 标为 Done，并把下一轮推荐更新为 `RAI-010` 核验/收口或 `RAI-012`。

验证：

- 基线确认：后端已经有平台草稿生成、API key/Bearer 认证、scope、quota、rate limit、请求日志和 `/api/v1/openapi.json`；缺口是 OpenAPI 只列路径和例子，开发者文档也未集中覆盖接入闭环。
- `cd code/backend && npm run test`：15 个测试通过。
- `cd code/backend && npm run typecheck`：通过。
- `cd code/backend && npm run build`：通过。
- 首次测试曾因 OpenAPI `requestId` 描述没有直接包含 `idempotent` 失败；已把描述改成明确的 `idempotent key` 后重跑通过。

风险和下一步：

- 本轮没有引入 OpenAPI JSON Schema 自动生成或运行时校验，schema 仍需随 `platformGenerateResumeSchema` 手工同步；当前测试会守住关键字段和 refs。
- 下一轮建议核验 `RAI-010` 管理端真实数据入口是否已经达到验收，或启动 `RAI-012` 拆分 WorkspacePanel。

## 2026-06-17 - RAI-005 成长记录职业记忆闭环

目标：让用户保存的职业记忆不仅能长期保留，还能从记忆自身直接进入 JD 定制并被明确选中，形成“记录 -> 复用 -> 标记已使用”的闭环。

已完成：

- `code/front/src/App.vue`：`growth:<id>` 命令从“回到成长页”改为打开编辑器 JD 定制并预选对应职业记忆；JD 卡片会固定展示已选记忆，不再受最近 6 条列表限制；AI dock 关闭时仍走现有提示。
- `code/front/src/components/WorkspacePanel.vue`：成长记录卡片新增 `用于 JD` 操作，直接触发同一条复用命令；归档记忆不显示该操作。
- `code/front/src/components/CommandPalette.vue`：职业记忆命令提示改为 `用于 JD`，和真实动作一致。
- `code/front/test/resume-store.test.ts`：补充 JD 草稿应用职业记忆后的使用痕迹断言，确认 `usedByResumeIds` 记录且不重复。
- `.ai/backlog.md`：将 `RAI-005` 标为 Done，并把下一轮推荐更新为 `RAI-010` 或 `RAI-011`。

验证：

- 代码基线确认：成长记录数据结构、append-only 列表、编辑、搜索、归档、使用状态和旧 checklist 兼容已经存在；缺口是单条职业记忆无法直接带入 JD 定制，且编辑器 JD 卡只显示最近 6 条活跃记忆。
- `cd code/front && npm run test`：24 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- Browser 桌面验收：在 `#growth` 用表单新增一条职业记忆后，卡片显示 `用于 JD`；点击后进入 `#editor`，JD 定制卡片可见，该记忆显示在 `引用职业记忆` 区域并带 `on` 选中态，焦点落到目标岗位输入框。
- Browser 390px 验收：`#growth` 继续显示 RAI-009 的窄屏支持提示，卡片边界在 390px 视口内，无横向溢出。
- Browser 控制台：无前端 error；浏览器验收用的临时职业记忆已从活跃列表归档。

风险和下一步：

- 本轮没有给 JD 卡片增加职业记忆搜索/多选管理；如果用户有大量记忆，后续可把选择器升级成可搜索抽屉。
- 下一轮建议优先做 `RAI-010` 管理端真实数据入口，或 `RAI-011` 平台 API 文档。

## 2026-06-17 - RAI-009 窄屏审计闭环

目标：让小屏用户不再看到被 1180px 桌面画布截断的编辑器/工作台，而是看到明确的受支持设备说明，并保留已经适配的简历库可用路径。

已完成：

- `code/front/src/App.vue`：根壳增加 `data-view`，新增窄屏支持面板；非简历库页面在 720px 以下提示当前页面需要更宽工作区，提供打开简历库和命令面板入口；手机上新建空白简历会进入简历库并提示桌面继续编辑。
- `code/front/src/style.css`：720px 以下取消全局 1180px 最小宽度，隐藏侧边 rail 和桌面多栏主区；顶部压缩为品牌、语言、命令入口；简历库页面改为 100vw，继续使用上一轮的移动布局。
- `.ai/backlog.md`：将 `RAI-009` 标为 Done，并把下一轮推荐更新为 `RAI-005` 或 `RAI-010`。

验证：

- 基线复现：390px 编辑器下 `.studio-shell` 宽 1180px，`.studio-topbar` 和 `.studio-main` 宽 1220px，保存/同步状态被推到视口外。
- `cd code/front && npm run test`：24 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- Browser 390px 编辑器验收：shell/topbar 宽 390px，无横向溢出；桌面编辑器主区 `display:none`；支持提示卡完整显示 `当前页面需要更宽的工作区`、当前页面和建议宽度，按钮边界在视口内。
- Browser 390px 简历库验收：点击支持提示里的 `打开简历库` 后进入 `#documents`；简历库、工具栏和首张卡片均在 390px 视口内，无横向溢出。
- Browser 1280px 编辑器验收：编辑器、预览、右侧 inspector 三栏正常显示；支持提示隐藏；控制台无 error。

风险和下一步：

- 本轮采用“桌面专用路径明确提示”的策略，没有把编辑器/投递管线重构成完整手机布局；如果未来需要手机编辑，应另开更大切片重做编辑器信息架构。
- 下一轮建议优先核验并收口 `RAI-005` 成长记录职业记忆，或启动 `RAI-010` 管理端真实数据入口。

## 2026-06-17 - RAI-004 保存同步状态真实化闭环

目标：让用户在后端不可用或同步失败时，不再被顶部 `Saved` 误导，能清楚知道内容只是本地保存、云端仍待同步。

已完成：

- `code/front/src/stores/resume.ts`：简历正文/配置编辑不再因后端离线直接跳过同步记录；离线时由 `runBackendSync()` 写入 `local-only` sync operation，后续可重连重试。
- `code/front/src/components/TopBar.vue`：顶部状态拆分为本地保存状态和云端同步状态；保存状态能显示保存中、本地已保存，云端状态能显示同步中、本地待同步、同步失败、在线和本地模式，并复用重连/重试入口。
- `code/front/src/style.css`：为本地待同步和同步失败补充可辨识颜色，避免看起来像普通成功态。
- `code/front/test/resume-store.test.ts`：新增离线编辑入队测试，覆盖活跃简历内容编辑在后端不可用时生成 `local-only` 操作。
- `.ai/backlog.md`：将 `RAI-004` 标为 Done，并把 RAI-004 浏览器验收发现的 390px 顶部状态外溢登记到 `RAI-009`。

验证：

- `cd code/front && npm run test`：24 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- `curl -s --max-time 2 http://127.0.0.1:8787/health`：超时，确认本轮浏览器验收走后端离线路径。
- Browser 桌面验收：打开 `http://127.0.0.1:5173/#editor`，页面已有失败队列时顶部显示 `本地已保存` + `同步失败 1`；真实编辑岗位字段后先显示 `保存中`，约 1.2s 后显示 `本地已保存` + `本地待同步 1`，且 title 文案说明后端恢复后可同步。
- Browser 390px 观察：编辑器仍受全局桌面画布限制，保存/同步状态元素被推到视口外；已归入 `RAI-009`，本轮不扩大范围修复。

风险和下一步：

- 本轮未启动后端验证真实在线重试成功路径；现有 store 测试仍覆盖后端连接和远端状态应用，后续可在后端联调切片里补完整重试验收。
- 下一轮建议优先做 `RAI-009` 窄屏审计，或 `RAI-005` 成长记录职业记忆。

## 2026-06-16 - RAI-008 简历库搜索和来源闭环

目标：让拥有多份岗位版本的求职者能按公司、岗位、标题、标签、来源和关联投递快速找回对应简历。

已完成：

- `code/front/src/utils/documentLibrary.ts`：新增文档库匹配/过滤/排序工具，覆盖活跃/收藏/归档、来源、关键词和关联投递；搜索支持多 token 同时命中文档元数据和投递信息。
- `code/front/src/components/WorkspacePanel.vue`：Documents 页面复用文档库工具；新增来源筛选 chips、结果摘要和清除搜索/来源筛选按钮；现有卡片继续展示来源、标签、关联投递、最近导出和最近编辑。
- `code/front/test/document-library.test.ts`：新增文档库搜索测试，覆盖标题、标签、来源、关联投递、状态筛选、来源筛选和按关联投递排序。
- `code/front/src/style.css`：补充来源筛选和结果摘要样式；在 390px 下为 Documents 页面加局部响应式规则，让工具栏、来源筛选、摘要和卡片网格不再溢出视口。
- `.ai/backlog.md`：将 `RAI-008` 标为 Done，并把下一轮推荐更新为 `RAI-004` 或 `RAI-009`。

验证：

- `cd code/front && npm run test`：23 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- `curl -I http://127.0.0.1:5173/`：本地前端服务返回 200。
- Browser 桌面验收：打开 `http://127.0.0.1:5173/#documents`，DOM 显示来源筛选和结果摘要；搜索 `FutureHire` 后只剩 1 份岗位版本并显示 `显示 1 / 2 份简历`；点击 `JD 草稿` 来源后显示 `显示 1 / 1 份简历`。
- Browser 390px 验收：Documents 页面 `.workspace-main--documents`、工具栏、搜索组、来源筛选、摘要和卡片网格边界均在视口内。

风险和下一步：

- 全局 `.studio-shell` 仍有 1180px 最小宽度，其他页面尤其编辑器仍属于 `RAI-009` 窄屏审计范围；本轮只给 Documents 页面做局部适配。
- 下一轮建议优先做 `RAI-004` 保存/同步状态真实化，或 `RAI-009` 全局窄屏支持策略。

## 2026-06-16 - RAI-006 投递详情和时间线闭环

目标：让跟踪岗位的用户更容易从投递列表进入详情，能追溯 JD、定制元数据、跟进状态、备注和进度历史。

已完成：

- `code/front/src/components/WorkspacePanel.vue`：确认现有投递详情抽屉已覆盖 JD 快照、跟进状态、联系人、下一步、定制元数据、备注和时间线新增/编辑/删除；本轮补充投递主行整行点击、Enter/Space 键盘打开详情、当前详情行选中态，以及详情/编辑/删除/关闭按钮的可读 `aria-label`。
- `code/front/src/utils/pipeline.ts`：新增可复用的跟进状态判断和本地日期 key 工具，组件不再内联日期比较逻辑。
- `code/front/test/pipeline-utils.test.ts`：新增跟进状态测试，覆盖未设置、逾期、今日、未来和 offer/rejected 终态忽略跟进日期。
- `code/front/src/style.css`：补充投递行 hover、焦点和选中样式，让详情入口更可发现。
- `.ai/backlog.md`：将 `RAI-006` 标为 Done，并把下一轮推荐更新为 `RAI-004` 或 `RAI-008`。

验证：

- `cd code/front && npm run test`：21 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- `curl -I http://127.0.0.1:5173/`：本地前端服务返回 200。
- 浏览器验收未完成：in-app Browser 能初始化并读取文档，但创建标签页仍超时等待 webview attach；未能完成实际点击详情抽屉验收。

风险和下一步：

- 下一轮浏览器恢复后建议补 S4 投递管线桌面/窄屏验收：点击投递行、键盘打开详情、编辑/删除时间线、关闭抽屉。
- 下一轮建议优先做 `RAI-004` 保存/同步状态真实化，或 `RAI-008` 简历库搜索和来源。

## 2026-06-16 - RAI-003 导出前预检闭环

目标：让准备导出 PDF 的求职者先看到具体风险、能一键处理可自动修复的问题，并在有阻塞问题时明确确认后才继续导出。

已完成：

- `code/front/src/utils/exportPrecheck.ts`：新增可测试的导出预检判断，覆盖缺姓名、缺联系方式、短简介、可见经历为空、可见技能为空、联系方式过长、多页和分页线风险；隐藏章节不会继续触发对应缺失问题。
- `code/front/src/components/PreviewPanel.vue`：预检弹窗展示阻塞/提醒、具体修复建议和快捷修复按钮；支持添加经历、添加技能、隐藏经历/技能/奖项/证书/语言章节、减小简历字号；阻塞问题的继续导出改成“仍要导出 -> 确认继续导出”二次确认。
- `code/front/src/stores/resume.ts`、`code/front/src/App.vue`：新增并使用 `setResumeFontSize()`，让预检的减小字号和编辑器字号滑杆都走统一的更新时间与同步路径。
- `code/front/src/style.css`：补充导出预检快捷修复按钮和阻塞确认提示样式。
- `code/front/test/export-precheck.test.ts`：新增预检工具测试，覆盖核心缺失、隐藏章节、多页风险和修复动作。
- `.ai/backlog.md`：将 `RAI-003` 标为 Done，并更新下一轮推荐。

验证：

- `cd code/front && npm run test`：18 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- `curl -I http://127.0.0.1:5173/`：本地前端服务返回 200。
- 代码级基线确认：本轮前 `PreviewPanel.vue` 已有基础预检弹窗，但预检逻辑只在组件内，缺少快捷修复；阻塞问题会禁用继续导出，不能按 PRD 的“二次确认后继续”处理。
- 浏览器验收未完成：in-app Browser 能初始化并读取文档，但 `browser.tabs.new()` 多次超时等待 webview attach，`browser.tabs.selected()` 返回无活跃 tab，无法完成 1280x800 和 390x844 点击验收。

风险和下一步：

- 下一轮浏览器恢复后建议补 S5 桌面/窄屏验收：制造缺联系方式/空经历/多页，点击导出，检查快捷修复、二次确认继续导出和弹窗布局。
- 下一轮建议优先做 `RAI-006` 投递详情和时间线，或 `RAI-004` 保存/同步状态真实化。

## 2026-06-16 - RAI-002 空白简历引导闭环

目标：让新用户选择空白简历后直接进入编辑器，并看到可操作的核心字段清单，而不是停在工作台或只看到泛化完整度建议。

已完成：

- `code/front/src/components/WelcomeDialog.vue`、`code/front/src/App.vue`：欢迎弹窗选择空白后关闭并进入编辑器；命令面板新建空白简历也会定位到个人信息字段。
- `code/front/src/components/EditorPanel.vue`：编辑器正文新增空白/未完成简历引导清单，覆盖个人信息、求职标题、个人简介、最近经历、核心技能和导出检查；点击清单项会展开对应章节、滚动定位并聚焦字段，经历/技能为空时会先创建条目。
- `code/front/src/components/editor/PersonalEditor.vue`、`SummaryEditor.vue`、`ExperienceEditor.vue`、`SkillsEditor.vue`：给核心输入增加稳定 `data-guide-field`，避免跳转依赖占位符或 DOM 顺序。
- `code/front/src/stores/resume.ts`：`clearAll()` 会把当前文档来源和元数据重置为真正的 `blank` 状态。
- `code/front/test/resume-store.test.ts`：新增空白清理测试，覆盖来源、文件夹、目标岗位、标签、favorite 和完整度。
- `.ai/backlog.md`：将 `RAI-002` 标为 Done，并更新下一轮推荐。

验证：

- `cd code/front && npm run test`：16 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- 代码级基线确认：本轮前欢迎弹窗 `choose('blank')` 只调用 `store.clearAll()` 和关闭弹窗，不会进入编辑器；右侧引导按钮只滚到 `.editor-panel`，不会展开或聚焦对应字段。
- 浏览器验收未完成：`npm run dev -- --host 127.0.0.1 --port 5173` 已启动，但 in-app Browser 先返回连接断开；插件缓存切到 `26.609.71450` 后，`agent.browsers.list()` 返回空数组，无法完成 1280x800 和 390x844 点击验收。

风险和下一步：

- 仍建议下一轮浏览器恢复后补一次 S1 桌面和窄屏验收：欢迎空白 -> 编辑器清单 -> 点击经历/技能 -> 字段聚焦 -> 导出预检入口。
- 下一轮建议优先评估 `RAI-003` 导出前预检或 `RAI-006` 投递详情和时间线。

## 2026-06-16 - RAI-007 破坏性动作确认闭环

目标：让用户在删除投递、删除时间线事件、恢复示例数据或导入备份覆盖数据前，先看到影响范围并明确确认。

已完成：

- `code/front/src/components/WorkspacePanel.vue`：投递删除、时间线事件删除、设置页恢复示例数据改为 `ConfirmDialog` 二次确认；文案说明 JD 快照、跟进计划、时间线事件、当前简历内容和关联对象是否受影响。
- `code/front/src/stores/resume.ts`、`code/front/src/types/resume.ts`：新增 `previewImportData` 和 `ImportDataPreview`，导入前可识别备份包含的简历、投递、职业记忆、历史记录、旧版单简历和设置。
- `code/front/src/components/TopBar.vue`：顶部备份导入从“选择文件即写入”改为“读取预览 -> 确认导入”，并区分 JSON 错误和无法识别的备份。
- `code/front/src/components/WelcomeDialog.vue`：欢迎导入复用同一预览解析，展示职业记忆和设置数量。
- `code/front/test/resume-store.test.ts`：补充导入预览测试。
- `.ai/backlog.md`：将 `RAI-007` 标为 Done，更新下一轮推荐。

验证：

- `cd code/front && npm run test`：15 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- 尝试启动浏览器验收：`npm run dev -- --host 127.0.0.1 --port 5173` 成功，但 in-app Browser 连接先报 `native pipe closed before response`，重连后 `agent.browsers.list()` 返回空数组；本轮未能完成 1280x800 和 390x844 的实际浏览器点击验收。

风险和下一步：

- 新确认弹窗依赖现有 `ConfirmDialog`，构建已覆盖模板类型，但仍建议下一轮浏览器恢复后补一次桌面/窄屏交互验收。
- 下一轮建议优先做 `RAI-003` 导出前预检，继续补导出信任状态。

## 2026-06-16 - RAI-001 编辑器 JD 定制入口闭环

目标：让用户从工作台或命令面板点击 JD/AI 定制后，落到编辑器里的真实 JD 草稿流程；AI dock 关闭时不再露出会断掉的入口。

已完成：

- `code/front/src/App.vue`：新增统一 `jd` 命令处理，进入编辑器后聚焦 `JD 定制草稿` 卡片；卡片高于视口时滚到顶部，避免窄屏把输入区滚出视口。
- `code/front/src/components/WorkspacePanel.vue`：工作台和成长页的 `AI 定制` CTA 改为触发真实 JD 定制命令，并遵守 `store.config.tweaks.showAI`。
- `code/front/src/components/CommandPalette.vue`：AI dock 关闭时隐藏 `开始 JD 定制` 命令。
- `code/front/src/style.css`：为 JD 卡片增加短暂聚焦态。
- `.ai/backlog.md`：将 `RAI-001` 标为 Done，并更新下一轮建议。

验证：

- `cd code/front && npm run test`：14 个测试通过。
- `cd code/front && npm run build`：通过；仍有既有 Node 20.15.1 低于 Vite 推荐版本和 PDF chunk 超 500 kB 警告。
- 浏览器桌面 1280x800：从工作台点击 `AI 定制` 后进入 `#editor`，JD 卡片可见，目标岗位输入框获得焦点；真实后端生成草稿后显示匹配分、关键词、策略、章节 review、应用所选和创建投递记录入口；控制台无 error。
- 浏览器窄屏 390x844：从工作台点击 `AI 定制` 后进入编辑器，JD 卡片在视口内，目标岗位输入框获得焦点。现有桌面画布式横向布局仍存在，属于 `RAI-009` 范围。
- AI dock 关闭验收：编辑器内匹配分/JD/导出建议卡片隐藏；工作台 `AI 定制` CTA 和命令面板 `开始 JD 定制` 同步隐藏。

风险和下一步：

- 本轮没有重做 JD 结果的细粒度 diff/撤销能力；后续可在 `RAI-001` 的增强方向或新切片中补结构化操作模型。
- 下一轮建议优先做 `RAI-003` 导出前预检，或 `RAI-007` 破坏性动作确认。

## 2026-06-16 - 初始化长期维护框架

目标：把“长期让 Codex 完善项目体验”的想法落实成项目内可恢复的运行规程。

已完成：

- 新增 `.ai/README.md`，说明 Goal 模式推荐写法和文件职责。
- 新增 `.ai/goal-mode.md`，定义每轮恢复上下文、选题、实现、验证和交接流程。
- 新增 `.ai/product-memory.md`，沉淀产品定位、用户、主路径、代码地图和已知风险。
- 新增 `.ai/ux-rubric.md`，把“体验好不好”转成可执行验收标尺。
- 新增 `.ai/backlog.md`，把现有 PRD/TODO/审计内容整理成 AI 可执行切片。
- 新增 `.ai/qa-scenarios.md`，沉淀关键路径验收场景。

验证：

- 读取了 `README.md`、`PRD.md`、`TODO.md`、`docs/user-flow-audit.md`、`执行路线图.md` 和各子项目 `package.json`。
- 当前未修改应用代码，未运行构建或测试。

注意：

- 工作区已有用户改动：`code/front/src/App.vue`、`code/front/src/stores/resume.ts`、`code/front/src/style.css`。
- 下一轮 Goal 开始前必须先阅读这些改动，避免覆盖用户工作。

建议下一步：

- 使用 `.ai/README.md` 中的推荐 Goal 文案，先做 1 个闭环。
- 如果用户改动不冲突，优先选择 `.ai/backlog.md` 的 `RAI-001`：编辑器 JD 定制入口。
