# Resume Tool AI Maintenance

这个目录是给 Codex Goal 模式使用的项目记忆和运行规程。它的目的不是替代 `PRD.md`、`TODO.md` 或 `docs/user-flow-audit.md`，而是把长期产品完善拆成可反复恢复的短闭环。

## 推荐 Goal 写法

不要把 Goal 写成“持续完善整个项目”。这类目标太长，容易让模型在无限范围里漂移。建议使用有边界的一轮：

```text
按照 .ai/goal-mode.md 完成 1 个 Resume Tool 体验改进闭环。先恢复上下文，选择一个最高价值且本轮能完成的小问题，完成代码修改、验证，并更新 .ai/backlog.md 和 .ai/session-log.md。
```

如果想让它连续工作，可以把目标写成：

```text
按照 .ai/goal-mode.md 完成 3 个连续但彼此独立的体验改进闭环。每个闭环都必须有用户场景、代码改动、验证记录和交接记录。
```

## 文件职责

- `.ai/goal-mode.md`：Codex Goal 模式的主入口，定义每轮怎么开始、怎么选题、怎么验收、怎么结束。
- `.ai/product-memory.md`：当前产品定位、用户、关键路径、代码地图和已知风险。
- `.ai/ux-rubric.md`：体验验收标尺，用来判断什么值得改，什么只是审美偏好。
- `.ai/backlog.md`：AI 维护专用 backlog，按可执行切片组织。
- `.ai/qa-scenarios.md`：手动和自动验收场景，尤其用于前端截图和关键路径走查。
- `.ai/session-log.md`：每轮结束后的交接日志，保持最新状态可恢复。

## 每轮开始时必须读取

1. `.ai/goal-mode.md`
2. `.ai/product-memory.md`
3. `.ai/ux-rubric.md`
4. `.ai/backlog.md`
5. `.ai/qa-scenarios.md`
6. `.ai/session-log.md`
7. `TODO.md`
8. `PRD.md`
9. `docs/user-flow-audit.md`

如果这些文档互相冲突，以最近的人类反馈和当前代码行为为准，并把判断写入 `.ai/session-log.md`。

## 长期运行原则

- 每轮只修一个主题，避免把产品变成无法验收的大改造。
- 每个问题必须绑定真实用户场景，不能只写“看起来可以优化”。
- 前端体验改动必须用浏览器或截图验收关键视口。
- 修改前先看 `git status`，遇到用户已有改动要绕开或顺着改，不能回滚。
- 每轮结束必须更新 `.ai/backlog.md` 和 `.ai/session-log.md`。
- 只有当代码、验证、记录都完成后，Goal 才能算完成。
