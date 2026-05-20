# Obsidian Spec Confirm

> [!note] 状态
> 插件已从历史提交恢复，并修复了 Codex Streamable HTTP MCP 初始化阶段的兼容性问题。

Obsidian 插件，用于与 Claude Code 集成，实现 Spec 文档的一键确认工作流。

## 功能

- **侧边栏面板**：在右侧边栏显示等待确认的 Spec 文档
- **一键确认**：在侧边栏直接点击确认按钮，无需切换窗口
- **状态同步**：确认后自动更新文档 frontmatter 的 `status` 字段
- **中心审阅 Vault**：支持传入项目里的系统绝对路径，并映射到当前 vault 中的 symlink Spec 文档
- **MCP Server**：内置 MCP Server，接收 Claude Code 的确认请求

## 中心审阅 Vault

如果希望只打开一个 Obsidian vault 来审阅多个项目的 Spec 文档，可以创建一个空的中心 vault，然后只把各项目的 `spec/` 目录链接进来。

推荐结构：

```text
SpecReviewVault/
├── .obsidian/
├── skills -> /Users/emtry/Downloads/Backup/skills/spec
├── project-a -> /path/to/project-a/spec
└── project-b -> /path/to/project-b/spec
```

注意：不要把项目链接放到 `.obsidian/` 目录下。`.obsidian/` 是 Obsidian 的配置目录，不是笔记内容区，放在里面不会作为普通 Markdown 文档参与文件树、搜索、反链和图谱索引。

手动创建链接示例：

```bash
mkdir -p "$HOME/Documents/SpecReviewVault"
ln -s "/Users/emtry/Downloads/Backup/skills/spec" "$HOME/Documents/SpecReviewVault/skills"
ln -s "/path/to/project-a/spec" "$HOME/Documents/SpecReviewVault/project-a"
```

这样 Obsidian 中会看到 `skills`、`project-a` 等目录；每个目录实际指向对应项目的 `spec/`。搜索、反链、图谱会按当前 vault 的索引工作。

MCP 调用时，`file_path` 可以继续传项目里的真实系统绝对路径：

```text
/Users/emtry/Downloads/Backup/skills/spec/03-功能实现/xxx/writer/plan.md
```

插件会在当前中心 vault 中查找 symlink 后真实路径相同的 `TFile`，然后使用 Obsidian 原生文件能力打开和写回 frontmatter。

## 工作流程

```
Claude Code 生成 Spec 文档
       ↓
调用 spec_confirm MCP 工具
       ↓
侧边栏自动打开，显示文档信息
       ↓
用户在 Obsidian 中审阅文档
       ↓
点击"✓ 确认"按钮
       ↓
文档 status 更新为"已确认"
       ↓
Claude Code 收到响应，继续执行
```

## 安装

1. 构建插件：
```bash
npm install
npm run build
```

2. 将以下文件复制到 Obsidian vault 的 `.obsidian/plugins/obsidian-spec-confirm/` 目录：
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. 在 Obsidian 设置中启用插件

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重新构建）
npm run dev

# 生产构建
npm run build
```

## MCP 配置

在 Codex 的 `~/.codex/config.toml` 中添加：

```toml
[mcp_servers.obsidian-spec-confirm]
url = "http://127.0.0.1:5300"
```

## 文件结构

```
obsidian-spec-confirm/
├── manifest.json           # 插件清单
├── package.json            # npm 配置
├── tsconfig.json           # TypeScript 配置
├── esbuild.config.mjs      # 构建配置
├── main.ts                 # 插件入口
├── styles.css              # 样式文件
└── src/
    ├── mcp-server.ts       # MCP Server 实现
    ├── mcp-tools.ts        # MCP 工具定义
    ├── status-manager.ts   # 状态管理
    ├── ui-components.ts    # UI 组件
    ├── sidebar.ts          # 侧边栏面板
    └── utils.ts            # 工具函数
```
