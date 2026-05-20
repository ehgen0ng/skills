# 文档规范

- 所有 Spec 文档使用 Obsidian Flavored Markdown
- Spec 目录命名：`YYYYMMDD-HHMM-任务描述`，任务描述使用中文
- 使用 `[[wikilink]]` 建立文档关联
- 每个文档包含完整 YAML frontmatter
- Spec 文档 frontmatter `status` 表示文档生命周期，不与 `lead/team-context.md` 的任务状态混用
- 新建角色产物时由 Agent 写 `status: 未确认`
- `spec_confirm` 成功确认时由 MCP 工具自动写 `status: 已确认`，Agent 不得重复手工替换
- 只有 MCP 超时/失败回退原生确认且用户确认通过时，Agent 才手工写 `status: 已确认`
- `status: 已归档` 只由 `spec-end` 在用户确认归档且目录移动成功后写入
- README 是最高层叙事文档，CODEMAP 维护源码地图
- 长篇背景写入 `spec/context/knowledge/`，不要塞进 AGENTS.md
