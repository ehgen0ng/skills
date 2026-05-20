/**
 * 工具函数模块
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 6: 文档状态管理
 */

import { App, TFile, FileManager } from 'obsidian';
import * as fs from 'fs';
import * as nodePath from 'path';
import { DocType, DocStatus } from './status-manager.js';

/**
 * 解析文档 frontmatter
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns Promise<Record<string, unknown>> frontmatter 对象
 */
export async function parseDocFrontmatter(
    app: App,
    file: TFile
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const fileManager = app.vault;

        // 使用 Obsidian 的 processFrontMatter 解析 frontmatter
        (fileManager as unknown as FileManager & { processFrontMatter: (file: TFile, callback: (frontmatter: Record<string, unknown>) => void) => void })
            .processFrontMatter(file, (frontmatter) => {
                resolve(frontmatter || {});
            });
    });
}

/**
 * 更新文档状态
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @param newStatus 新状态
 */
export async function updateDocStatus(
    app: App,
    file: TFile,
    newStatus: DocStatus
): Promise<void> {
    // 使用 Obsidian 的 fileManager.processFrontMatter 原子更新 frontmatter
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.status = newStatus;
    });
}

/**
 * 识别文档类型
 *
 * @param filePath 文档路径
 * @returns DocType | null 文档类型，如果无法识别则返回 null
 */
export function detectDocType(filePath: string): DocType | null {
    const fileName = filePath.split('/').pop() || '';

    if (fileName === 'plan.md') {
        return 'plan';
    } else if (fileName.startsWith('update-') && fileName.endsWith('.md') && !fileName.includes('-summary') && !fileName.includes('-review')) {
        return 'update';
    } else if (fileName.endsWith('-summary.md') || fileName === 'summary.md') {
        return 'summary';
    } else if (fileName.endsWith('-review.md') || fileName === 'review.md') {
        return 'review';
    }

    return null;
}

/**
 * 查找文档
 *
 * 支持两类路径：
 * - vault 内路径，如 "spec/skills/03-功能实现/xxx/plan.md"
 * - 系统绝对路径，如 "/Users/me/project/spec/03-功能实现/xxx/plan.md"
 *
 * 绝对路径用于中心审阅 vault 场景：vault 内通过 symlink 挂载多个项目的
 * spec/ 目录，MCP 调用方仍然传项目里的真实文件路径。
 *
 * @param app Obsidian App 实例
 * @param path 文档路径
 * @returns TFile | null 文档文件，如果不存在则返回 null
 */
export function findSpecFile(app: App, path: string): TFile | null {
    const normalizedInput = normalizeVaultPath(path);
    const directMatch = findSpecFileByVaultPath(app, normalizedInput);
    if (directMatch) {
        return directMatch;
    }

    if (isSystemAbsolutePath(path)) {
        return findSpecFileBySystemPath(app, path);
    }

    return null;
}

/**
 * 按 vault 内路径查找文档。
 */
function findSpecFileByVaultPath(app: App, path: string): TFile | null {
    const pathsToTry = new Set<string>([
        path,
        normalizeVaultPath(path),
    ]);

    // 如果路径以 spec/ 开头，尝试去除它（vault 根目录可能已经是 spec/）
    if (path.startsWith('spec/') || path.startsWith('spec\\')) {
        pathsToTry.add(path.substring(5));
        pathsToTry.add(normalizeVaultPath(path.substring(5)));
    }

    // 首先尝试 getAbstractFileByPath（更快）
    for (const p of pathsToTry) {
        const file = app.vault.getAbstractFileByPath(p);
        if (file instanceof TFile) {
            return file;
        }
    }

    // 最后遍历所有 Markdown 文件来查找
    const allFiles = app.vault.getMarkdownFiles();
    for (const f of allFiles) {
        // 比较时统一使用正斜杠
        const normalizedFilePath = f.path.replace(/\\/g, '/');
        for (const p of pathsToTry) {
            const normalizedSearchPath = p.replace(/\\/g, '/');
            if (normalizedFilePath === normalizedSearchPath || f.path === p) {
                return f;
            }
        }
    }

    return null;
}

/**
 * 按系统绝对路径查找文档。
 */
function findSpecFileBySystemPath(app: App, filePath: string): TFile | null {
    const vaultRelativePath = toVaultRelativePath(app, filePath);
    if (vaultRelativePath) {
        const file = findSpecFileByVaultPath(app, vaultRelativePath);
        if (file) {
            return file;
        }
    }

    const targetRealPath = realPath(filePath);
    if (!targetRealPath) {
        return null;
    }

    const specTail = getSpecTail(filePath);
    const markdownFiles = app.vault.getMarkdownFiles();
    const candidates = specTail
        ? markdownFiles.filter((file) => normalizeVaultPath(file.path).endsWith(specTail))
        : markdownFiles.filter((file) => file.name === nodePath.basename(filePath));

    for (const file of candidates) {
        const fullPath = getFullVaultFilePath(app, file.path);
        if (!fullPath) {
            continue;
        }

        const fileRealPath = realPath(fullPath);
        if (fileRealPath && sameSystemPath(fileRealPath, targetRealPath)) {
            return file;
        }
    }

    return null;
}

/**
 * 将系统绝对路径转换成 vault 内路径。
 */
function toVaultRelativePath(app: App, filePath: string): string | null {
    const basePath = getVaultBasePath(app);
    if (!basePath) {
        return null;
    }

    const relativePath = nodePath.relative(nodePath.resolve(basePath), nodePath.resolve(filePath));
    if (relativePath.startsWith('..') || nodePath.isAbsolute(relativePath)) {
        return null;
    }

    return normalizeVaultPath(relativePath);
}

/**
 * 获取 vault 在系统文件系统中的根路径。
 */
function getVaultBasePath(app: App): string | null {
    const adapter = app.vault.adapter as unknown as { getBasePath?: () => string };
    if (typeof adapter.getBasePath !== 'function') {
        return null;
    }

    return adapter.getBasePath();
}

/**
 * 获取 vault 内文件的系统路径。
 */
function getFullVaultFilePath(app: App, vaultPath: string): string | null {
    const adapter = app.vault.adapter as unknown as { getFullPath?: (path: string) => string };
    if (typeof adapter.getFullPath === 'function') {
        return adapter.getFullPath(vaultPath);
    }

    const basePath = getVaultBasePath(app);
    if (!basePath) {
        return null;
    }

    return nodePath.join(basePath, vaultPath);
}

/**
 * 从项目绝对路径里提取 spec/ 后面的尾部路径。
 */
function getSpecTail(filePath: string): string | null {
    const normalizedPath = normalizeVaultPath(filePath);
    const marker = '/spec/';
    const markerIndex = normalizedPath.lastIndexOf(marker);

    if (markerIndex >= 0) {
        return normalizedPath.substring(markerIndex + marker.length);
    }

    if (normalizedPath.startsWith('spec/')) {
        return normalizedPath.substring(5);
    }

    return null;
}

function normalizeVaultPath(path: string): string {
    return path.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
}

function isSystemAbsolutePath(path: string): boolean {
    return nodePath.isAbsolute(path) || /^[a-zA-Z]:[\\/]/.test(path);
}

function realPath(path: string): string | null {
    try {
        return fs.realpathSync.native(path);
    } catch {
        try {
            return fs.realpathSync(path);
        } catch {
            return null;
        }
    }
}

function sameSystemPath(a: string, b: string): boolean {
    if (process.platform === 'win32') {
        return a.toLowerCase() === b.toLowerCase();
    }

    return a === b;
}

/**
 * 检查文档是否在 spec/ 目录下
 *
 * @param filePath 文档路径
 * @returns boolean 是否在 spec/ 目录下
 */
export function isSpecFile(filePath: string): boolean {
    const normalizedPath = normalizeVaultPath(filePath);
    return normalizedPath.startsWith('spec/') ||
        normalizedPath.includes('/spec/') ||
        detectDocType(filePath) !== null;
}

/**
 * 获取文档标题
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns string 文档标题
 */
export async function getDocTitle(app: App, file: TFile): Promise<string> {
    try {
        const frontmatter = await parseDocFrontmatter(app, file);
        return (frontmatter.title as string) || file.basename;
    } catch {
        return file.basename;
    }
}

/**
 * 获取文档状态
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns Promise<DocStatus> 文档状态
 */
export async function getDocStatus(app: App, file: TFile): Promise<DocStatus> {
    try {
        const frontmatter = await parseDocFrontmatter(app, file);
        return (frontmatter.status as DocStatus) || '未确认';
    } catch {
        return '未确认';
    }
}

/**
 * 打开文档
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 */
export async function openDoc(app: App, file: TFile): Promise<void> {
    await app.workspace.openLinkText(file.path, 'true');
}

export default {
    parseDocFrontmatter,
    updateDocStatus,
    detectDocType,
    findSpecFile,
    isSpecFile,
    getDocTitle,
    getDocStatus,
    openDoc,
};
