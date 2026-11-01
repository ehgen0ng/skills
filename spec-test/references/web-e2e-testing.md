# Web 端侧 E2E 测试策略

## 何时使用

当 Spec 涉及 Web 页面、浏览器交互、前端路由、表单、登录态、权限、前后端联动、异步任务或用户可见工作流时使用本策略。

不要用于纯后端 API、纯 CLI、纯文档变更；这些场景应使用对应测试策略或常规测试计划。

执行前先读取 [测试临时资源管理](temporary-resources.md)：临时工具与数据均放在仓库外系统临时目录，按需生成，用完清理。

## tester/test-plan.md 必须补充

### 用户使用场景

用真实用户目标组织 E2E 用例，而不是只列接口或组件：

| 场景编号 | 用户角色 | 业务目标 | 前置数据 | 操作路径 | 关键断言 |
|---------|----------|----------|----------|----------|----------|
| US-001 | 普通用户/管理员 | 完成某业务动作 | 测试账号、初始数据 | 打开页面 → 点击 → 输入 → 提交 → 查看结果 | UI 状态、数据变化、日志证据 |

要求：
- 至少覆盖 1 条主成功路径
- 至少覆盖 1 条失败/拒绝路径
- 涉及权限时覆盖不同角色
- 涉及异步任务时覆盖提交后状态刷新或轮询结果

### 浏览器自动化计划

优先使用项目已有 E2E 工具（Playwright / Cypress / Vitest browser 等）。若项目没有现成框架，使用当前运行环境可用的浏览器自动化能力。

计划中写清：
- 启动前端和后端的命令
- 测试 URL、浏览器类型、视口尺寸
- 测试账号和角色（脱敏）
- 需要预置的数据
- 稳定选择器策略（优先 `data-testid` / role / label）
- 哪些断言或失败场景需要截图，是否确需 trace/录屏，以及临时输出路径与清理条件
- 浏览器/驱动是否可复用；缺少时如何在当前平台临时准备，并重定向下载缓存和用户 profile

### 前后端可观测点

每条用户场景明确断言及可观测点，按实际需要采集证据：

| 证据 | 要求 |
|------|------|
| 前端控制台 | 捕获 `console.error`、未处理异常、关键业务日志 |
| 网络请求 | 记录关键请求的 method、url、status、耗时、错误摘要；禁止保存 token |
| 后端日志 | 用 run id / trace id / request id 关联本次测试操作 |
| 页面截图 | 视觉断言或失败现场需要时采集，不默认保存每个状态 |
| trace/录屏 | 复杂交互或偶发失败确需复现时启用，只临时保留仍需分析的证据 |

## 执行流程

### 1. 创建 run id 和日志目录

按 [测试临时资源管理](temporary-resources.md) 分配 `TEST_TMP_ROOT`，准备所需工具并显式配置浏览器、reporter、覆盖率和日志路径；`ARTIFACT_DIR` 为其中的产物目录。以下仅示意可能需要的文件，不要求全部生成：

```text
RUN_ID=YYYYMMDD-HHMM-web-e2e-XXX
{ARTIFACT_DIR}/
├── audit.log
├── browser-console.ndjson
├── network-summary.json
├── backend.log
├── user-flow.md
├── screenshots/
├── recordings/
└── traces/
```

所有日志、截图、trace 和测试报告原始文件都写入仓库外的 `ARTIFACT_DIR`；临时浏览器、下载缓存和 profile 同属 `TEST_TMP_ROOT`，不落入 Spec 或长期用户缓存目录。

证据文件必须由测试运行自动生成：
- `browser-console.ndjson` 由浏览器自动化监听 console、pageerror、unhandled rejection 后逐行写入
- `network-summary.json` 由请求/响应监听器、代理、HAR 转换或测试框架 reporter 生成
- `screenshots/`、`traces/`、`recordings/` 由浏览器自动化工具在执行过程中保存
- `backend.log` 由服务日志按 RUN_ID / trace id 过滤导出，或由测试命令启动服务时重定向生成
- `audit.log` 由测试 runner 记录 run id、用例编号、时间戳和执行状态

禁止 Agent 在测试结束后手写或编辑这些日志、JSON、trace、录屏和截图内容。Agent 只可以在 `tester/test-report.md` 中总结测试结论并引用证据路径。若无法自动采集某项证据，必须在 `tester/test-report.md` 说明缺失原因，不得伪造或补写证据文件。

### 2. 启动并标记测试

- 启动前端、后端、依赖服务
- 使用测试账号和测试数据
- 在请求 header、query、表单备注或可控输入中注入 `RUN_ID`（如果系统支持）
- 如果系统支持 trace id，请记录 trace id 和 RUN_ID 的映射

### 3. 浏览器自动化模拟用户

按 `tester/test-plan.md` 的用户场景执行：

1. 打开入口页面
2. 按用户可见控件点击、输入、提交
3. 等待页面状态变化，不用固定 sleep 代替状态等待
4. 断言 UI 文案、URL、数据列表、按钮状态、错误提示
5. 按视觉断言或排障需要截图
6. 记录失败时的页面 HTML 摘要、截图、console、network

### 4. 捕获前端控制台

必须记录：
- `console.error`
- unhandled promise rejection
- uncaught exception
- 关键业务日志（如提交、保存、状态流转）

测试结论：
- 主成功路径不允许出现未解释的 console error
- 失败路径允许预期错误提示，但不能出现未处理异常

### 5. 捕获网络摘要

记录关键请求：

```json
{
  "run_id": "YYYYMMDD-HHMM-web-e2e-001",
  "case_id": "US-001",
  "requests": [
    {
      "method": "POST",
      "url": "/api/orders",
      "status": 201,
      "duration_ms": 123,
      "request_id": "req_xxx",
      "error": null
    }
  ]
}
```

脱敏规则：
- 不保存 Authorization、Cookie、token、password、secret、完整手机号、身份证号
- 请求/响应 body 只保留必要摘要

### 6. 关联后端日志

从后端日志中提取与 RUN_ID / trace id / request id 相关的片段，保存到 `backend.log`。

验证点：
- 成功路径有状态流转日志
- 失败路径有明确拒绝/校验/回滚日志
- 数据写入、外部 API、异步任务有可追踪 id
- 后端没有未处理异常或 5xx（除非该用例预期如此）

### 7. 失败处理

发现 bug 时通知 spec-debugger，必须附：
- 用户场景编号
- 操作步骤
- 预期与实际
- 临时截图路径（如有）、保留原因及清理条件
- console 摘要
- network 摘要
- 后端日志片段或 trace id

## tester/test-report.md 必须补充

### 用户场景执行结果

| 场景编号 | 结果 | UI 证据 | Console | Network | 后端日志 | 备注 |
|---------|------|---------|---------|---------|----------|------|
| US-001 | 通过/失败 | screenshots/... | browser-console.ndjson | network-summary.json | backend.log / trace id | |

### Web E2E 审计结论

- 控制台错误：无 / 有，说明
- 网络失败：无 / 有，说明
- 后端异常：无 / 有，说明
- 截图/trace/录屏（如有）：[临时路径；已清理 / 临时保留的原因与清理条件]
- 临时工具与缓存：[复用已有环境 / 临时准备的工具版本与来源；清理状态]
- 脱敏检查：已确认未保存敏感信息

## 证据与脱敏

所需原始证据自动采集到仓库外系统临时目录：

```text
{ARTIFACT_DIR}/
```

按断言和排障需要采集，并在报告中提取必要结论：
- `audit.log`：测试 run id、用例编号、测试账号角色（脱敏）、时间戳
- `browser-console.ndjson`：console error、未处理异常、关键业务日志
- `network-summary.json`：关键请求摘要
- `backend.log`：与 RUN_ID / trace id / request id 关联的后端日志片段
- `screenshots/`：视觉断言或失败现场需要的截图
- `traces/` 或 `recordings/`：确需分析的复杂交互或失败复现证据

报告必须在原始文件清理后仍能解释结果；用例行写明断言和关键摘要，临时路径标明清理状态。验证及排障完成后，停止本任务启动的浏览器/服务，按统一规则清理临时工具、profile、缓存和证据，不为归档复制回 Spec。

禁止保存：
- token、Cookie、Authorization header
- 密码、密钥、私钥
- 完整手机号、身份证号、银行卡号
- 真实用户隐私数据
- 完整请求/响应 body（除非已脱敏且确有必要）

## 常见陷阱

- 只调用接口，不模拟用户真实点击路径
- 只看页面成功，不检查 console/network/backend log
- Agent 手写 `network-summary.json`、`browser-console.ndjson` 或 `backend.log` 充当证据，而不是让测试脚本和运行时自动采集
- 使用固定 sleep 导致测试不稳定
- 没有 run id，无法把前端操作和后端日志关联
- 只重定向截图，遗漏浏览器下载缓存、profile、自动生成的报告或原始覆盖率数据
- 保存了 token、Cookie 或真实用户隐私
