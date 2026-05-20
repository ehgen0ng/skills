---
name: spec-update
description: 当同一个活跃 Spec 需要小迭代、补充需求、修正方案或优化实现，且原 Spec 目录已有 writer/plan.md + executor/summary.md 时使用。不要用于新功能从零设计。
---

# Spec Update

## 核心原则

1. **同 Spec 原则**：update 文档必须放在原 Spec 目录的 `updater/` 下，禁止创建新的 Spec 根目录
2. **不归档原则**：更新完成后不归档，保留在原目录以便后续更新
3. **编号递增**：`updater/update-001.md` → `updater/update-002.md` → `updater/update-003.md`（三位数，不跳号）
4. **严格遵循方案**：只实现 `updater/update-xxx.md` 定义的修改，不添加方案之外的内容
5. **回归测试必须通过**：新增测试 + 修改测试 + 原有功能回归测试全部通过
6. **规范维护审查**：更新也可能产生长期规则，完成后同样检查是否需要维护 AGENTS.md / .agents/rules/

## 用户确认（必须执行）

在以下两个节点**必须先调用** `mcp__obsidian-spec-confirm__spec_confirm` MCP 工具确认；若调用超时或失败，则回退到运行环境的原生确认方式（如 `AskUserQuestion`）重新确认：

**节点 1 — 更新方案确认**（创建 `updater/update-xxx.md` 后）：
```text
确认目标：updater/update-xxx.md 已创建完成，更新方案是否可以开始执行？
确认选项：
- 确认，开始执行
- 需要修改（请说明修改要求）
```

**节点 2 — 审查报告确认**（生成 `reviewer/update-xxx-review.md` 后）：
```text
确认目标：reviewer/update-xxx-review.md 已创建完成，审查结果是否通过？
确认选项：
- 审查通过
- 需要修复（请说明问题）
```

调用 `mcp__obsidian-spec-confirm__spec_confirm` 时参数规则：
- `file_path`：优先传待确认文档的系统绝对路径，如 `/Users/.../project/spec/.../updater/update-001.md`；仅在无法取得系统绝对路径时传 vault 内路径。
- `title`：必须包含项目名，格式建议为 `[项目名] 更新方案 - 任务标题` 或 `[项目名] 更新审查 - 任务标题`；项目名优先取当前工作区根目录名，若 TeamLead 已提供 `project_name` 则使用该值。
- `doc_type`：`updater/update-xxx.md` 传 `update`；`reviewer/update-xxx-review.md` 传 `review`。

响应处理：选择确认选项 → 继续；选择修改/修复或"Other" → 根据用户反馈调整后重新确认。

## 文档模板

- **updater/update-xxx.md 模板**：见 [references/update-template.md](references/update-template.md)（含 frontmatter 字段说明）
- **updater/update-xxx-summary.md 模板**：见 [references/summary-template.md](references/summary-template.md)（含 frontmatter 字段说明）

## 工作流程

1. **确认原 Spec 目录**：找到目录，确认 `writer/plan.md` 和 `executor/summary.md` 都存在。若缺少 `executor/summary.md`，先用 spec-execute 完成原功能
2. **确定更新编号**：检查 `updater/` 下已有的 `update-*.md`，确定下一个编号；若 `updater/` 不存在则创建
3. **创建 updater/update-xxx.md**：参照 [references/update-template.md](references/update-template.md)，在 `updater/` 下创建
4. **等待用户确认**：先调用 `mcp__obsidian-spec-confirm__spec_confirm`，超时或失败回退原生确认方式（节点 1）
5. **检索历史经验**：调用 `/exp-search <关键词>`
6. **创建任务清单**：根据 `updater/update-xxx.md` 的"实现步骤"章节创建
7. **按方案实现更新**：严格遵循方案，不修改方案之外的代码
8. **编写/更新测试**：新增测试 + 修改测试 + 回归测试
9. **运行测试验证**：全部通过才能继续
10. **创建 updater/update-xxx-summary.md**：参照 [references/summary-template.md](references/summary-template.md)，应用 Obsidian 格式：`[[../writer/plan|设计方案]]` 双链、`> [!success]` / `> [!warning]` Callout、`#spec/更新` 标签
11. **使用 spec-review 审查**：生成 `reviewer/update-xxx-review.md`
12. **等待用户确认审查报告**：先调用 `mcp__obsidian-spec-confirm__spec_confirm`，超时或失败回退原生确认方式（节点 2）
13. **经验与规范收尾**：调用 `/exp-reflect`，并审查是否需要维护 AGENTS.md / .agents/rules/
14. **更新 team-context 共享区**：在 `lead/team-context.md` 的 `Task Progress` 中追加或更新 spec-update 自己的更新任务行，`artifact` 指向 `updater/update-xxx.md` / `updater/update-xxx-summary.md`，`status` 标记为 `done`，填写 `completed_at` 和 `updated_by: spec-update`；若更新解决了问题，同步更新 `Problem Resolution Log`
15. **完成更新**：不归档，保留在原目录

## 错误处理

| 场景 | 解决方案 |
|------|----------|
| 原 Spec 目录不存在 | 确认路径；若为新功能，用 spec-write + spec-execute |
| 缺少 `executor/summary.md` | 先用 spec-execute 完成原功能 |
| 回归测试失败 | 分析原因 → 修复回归代码 → 重新测试 → 全部通过后才能继续 |

## 后续动作

完成更新后：
1. 调用 `/exp-reflect` 进行经验反思
2. 审查是否需要维护 `AGENTS.md` / `.agents/rules/`；只写长期规则，不写一次性实现细节
3. 如有经验沉淀，更新 `updater/update-xxx-summary.md` 添加经验引用
4. 更新 `lead/team-context.md` 的 `Task Progress`，必要时更新 `Problem Resolution Log`
5. **不归档**，保留在原目录
