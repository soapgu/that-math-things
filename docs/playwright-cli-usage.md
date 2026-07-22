# Playwright 与 playwright-cli 在 OpenCode 中的使用

> 以 `那年那数那些事` 项目中 Phase 7 真实浏览器验收为例，介绍 Playwright、playwright-cli 及 OpenCode 技能的安装、使用和实际场景。

---

## 目录

- [Playwright 功能概述](#playwright-功能概述)
- [安装 playwright-cli 与技能](#安装-playwright-cli-与技能)
- [技能使用方法](#技能使用方法)
- [适用场景与产出](#适用场景与产出)
- [实例：Phase 7 验收全过程](#实例phase-7-验收全过程)
  - [背景与目标](#背景与目标)
  - [验收环境搭建](#验收环境搭建)
  - [场景执行过程](#场景执行过程)
  - [实际题目记录](#实际题目记录)
  - [控制台与尺寸矩阵](#控制台与尺寸矩阵)
  - [最终交付物](#最终交付物)

---

## Playwright 功能概述

[Playwright](https://playwright.dev) 是微软开发的开源浏览器自动化框架，支持 Chromium、Firefox、WebKit 三大内核。核心能力：

| 功能 | 说明 |
|:---|:---|
| **跨浏览器** | 同一套 API 操作 Chrome、Firefox、Safari |
| **自动等待** | 操作前自动等待元素可见、可用，无需手动 sleep |
| **网络拦截** | Mock API 响应、修改请求、模拟离线 |
| **截图与视频** | 全页截图、元素截图、录屏 |
| **Trace Viewer** | 录制完整操作轨迹，回放调试 |
| **真实设备模拟** | 模拟 iPhone、Pixel 等移动设备和视口 |
| **键盘/鼠标/触控** | 完整的输入事件模拟 |

---

## 安装 playwright-cli 与技能

### 1. 全局安装 playwright-cli

```bash
npm install -g @playwright/cli@latest
```

验证安装：

```bash
playwright-cli --version
```

### 2. 浏览器二进制文件

Playwright 使用自带的浏览器二进制文件，而非系统已安装的桌面浏览器。这保证了版本一致性和跨平台可重现。

`@playwright/cli` 安装时会自动下载 Chromium（安装过程可见 Downloading Chromium 提示），**大部分情况下不需要手动安装**。

如果自动下载失败，或需要额外浏览器（Firefox、WebKit）：

```bash
# 安装 Chromium
npx playwright install chromium

# 安装所有支持的浏览器
npx playwright install
```

验证浏览器已就绪：

```bash
playwright-cli open --browser=chromium
playwright-cli close
```

### 3. 技能文件来源

`SKILL.md` 和 `references/` 文档**捆绑在 `@playwright/cli` 包内**，位于 `node_modules/playwright-core/lib/tools/cli-client/skill/`。

验证包内内容：

```bash
npm pack --dry-run @playwright/cli 2>&1 | grep skills/
```

输出应包含 `skills/playwright-cli/SKILL.md` 和 `skills/playwright-cli/references/` 下的各文档。

### 4. 安装技能到 OpenCode

OpenCode 会从以下路径自动发现技能（按优先级从高到低）：

- `.opencode/skills/<name>/SKILL.md`（项目级）
- `~/.config/opencode/skills/<name>/SKILL.md`（用户全局）
- `.claude/skills/<name>/SKILL.md`（Claude 兼容，项目级）
- `~/.claude/skills/<name>/SKILL.md`（Claude 兼容，全局）
- `.agents/skills/<name>/SKILL.md`（代理兼容，项目级）
- `~/.agents/skills/<name>/SKILL.md`（代理兼容，全局）

#### 方案 A：项目级安装（推荐）

```bash
playwright-cli install --skills
rm -rf .opencode/skills/playwright-cli
cp -r .claude/skills/playwright-cli .opencode/skills/
```

先安装到 `.claude/`，再同步到 `.opencode/` 统一管理（`rm -rf` 防止 `cp -r` 嵌套）。

#### 方案 B：用户全局安装

`playwright-cli install --skills` **不支持全局安装**。先安装到项目 `.claude/`，再拷贝到全局目录，最后清理本地：

```bash
playwright-cli install --skills
mkdir -p ~/.config/opencode/skills/playwright-cli
cp -r .claude/skills/playwright-cli/* ~/.config/opencode/skills/playwright-cli/
rm -rf .claude/skills/playwright-cli
```

或在家目录执行项目级命令（借助 Claude 兼容路径）：

```bash
cd ~ && playwright-cli install --skills
```

会将文件安装到 `~/.claude/skills/playwright-cli/`，OpenCode 同样能识别。

### 5. 验证技能可用

```bash
playwright-cli open https://example.com
playwright-cli snapshot
playwright-cli close
```

技能就绪后，当 AI 遇到浏览器自动化、UI 验收、E2E 测试等任务时，OpenCode 会自动加载此技能。也可以在对话中手动引用：

```text
@playwright-cli
```

---

## 技能使用方法

### 核心命令

```bash
# 打开浏览器
playwright-cli open http://localhost:5173/that-math-things/

# 导航到 URL
playwright-cli goto https://example.com

# 获取页面快照（含元素 ref 编号）
playwright-cli snapshot

# 用 ref 编号点击元素
playwright-cli click e15

# 输入文字
playwright-cli type "hello"
playwright-cli fill e5 "user@example.com" --submit

# 键盘操作
playwright-cli press Enter
playwright-cli press ArrowDown
```

### 元素定位

快照中的每个可交互元素都有唯一 ref（如 `e3`、`e15`），可直接使用：

```bash
playwright-cli click e3
playwright-cli fill e7 "42"
```

也支持 CSS 选择器和 Playwright locator：

```bash
# CSS 选择器
playwright-cli click "#main > button.submit"

# Role locator
playwright-cli click "getByRole('button', { name: '开始训练' })"

# Test ID
playwright-cli click "getByTestId('next-button')"
```

### 流程控制

```bash
playwright-cli go-back       # 后退
playwright-cli go-forward    # 前进
playwright-cli reload        # 刷新
playwright-cli resize 1024 768  # 调整视口
```

### 多标签页

```bash
playwright-cli tab-list
playwright-cli tab-new https://example.com
playwright-cli tab-close
playwright-cli tab-select 0
```

### 调试工具

```bash
# 查看控制台日志
playwright-cli console
playwright-cli console warning   # 只看 warning 级别
playwright-cli console error     # 只看 error 级别

# 查看网络请求
playwright-cli requests
playwright-cli request 5         # 查看第 5 条请求详情

# Tracing（操作轨迹录制）
playwright-cli tracing-start
# ... 执行操作 ...
playwright-cli tracing-stop

# 录屏
playwright-cli video-start video.webm
# ... 执行操作 ...
playwright-cli video-stop
```

### 存储操作

```bash
playwright-cli localstorage-list
playwright-cli localstorage-get theme
playwright-cli localstorage-set theme dark

playwright-cli cookie-list
playwright-cli cookie-get session_id
```

### 浏览器会话管理

```bash
# 命名会话（可并行多个浏览器）
playwright-cli -s=mysession open
playwright-cli -s=mysession click e3
playwright-cli -s=mysession close

# 查看所有会话
playwright-cli list
```

---

## playwright-cli vs @playwright/mcp

`@playwright/mcp` 是微软官方提供的另一个浏览器自动化方案，与 playwright-cli 互补而非替代。

| 维度 | playwright-cli + SKILL | @playwright/mcp |
|:---|:---|:---|
| **工作机制** | CLI 命令通过 Bash 工具调用，快照解析为文本 | MCP 服务器注册为 OpenCode 内置工具，提供结构化工具接口 |
| **Token 效率** | **更高** —— 避免加载大工具 Schema 和完整的无障碍树到上下文 | 每次调用都加载工具定义和页面结构，消耗更多 Token |
| **适用场景** | 高吞吐编码代理，需在浏览器自动化和大代码库间平衡上下文 | 探索式自动化、自愈测试、长周期自主工作流 |
| **状态管理** | 命名会话（`-s=mysession`），每次调用独立 | MCP 进程持续运行，状态持久化 |
| **安装** | `npm install -g @playwright/cli` | `npx @playwright/mcp@latest`（无安装，按需启动） |
| **OpenCode 配置** | SKILL.md + `opencode.json` 权限控制 | `opencode.json` 中 `mcp` 字段配置 |

### 官方建议

摘自 `@playwright/mcp` README：

> **CLI**：现代编码代理更倾向 CLI + SKILL 方式，因为 CLI 调用 Token 效率更高，避免将大工具 Schema 和冗长的无障碍树加载到模型上下文中。这使得 CLI + SKILL 更适合在有限上下文窗口中平衡浏览器自动化与大代码库、测试和推理的高吞吐编码代理。
>
> **MCP**：适合需要持久状态、丰富内省能力和迭代式页面结构推理的专用代理循环，如探索式自动化、自愈测试或长周期自主工作流，其中维护连续浏览器上下文的收益超过 Token 成本。

### 本项目的选择

Phase 7 覆盖 12 个浏览器验收场景、多次页面跳转和状态检查。用 CLI + SKILL 每次只传必要的命令和结果，Token 开销更低。如果是需要持续保持页面状态的自愈测试场景，MCP 会更合适。

---

## 适用场景与产出

| 场景 | 典型任务 | 产出 |
|:---|:---|:---|
| **UI 自动化验收** | 验证页面渲染、路由跳转、按钮交互 | 快照、控制台日志、截图 |
| **E2E 流程测试** | 完整体验：设置→做题→结算→订正 | 操作日志、控制台状态 |
| **响应式布局验证** | 断点切换、截断/溢出检查 | 各尺寸截图、快照对比 |
| **问题复现** | 记录精确操作步骤用于修复 | 复现步骤、控制台 error、Trace 文件 |
| **设计评审** | UI 走查，标注问题区域 | 标注截图 + 用户反馈注释 |

---

## 实例：Phase 7 验收全过程

### 背景与目标

`那年那数那些事` v2.4 新增辅助运算（凑十法、破十法、平十法）分步引导动画。Phase 7 使用 playwright-cli 在真实浏览器中对 v2.4 进行端到端验收，覆盖 12 个场景：

1. 首页与设置页基础流程
2. 关闭辅助的原有做题流程
3. 刷新恢复
4. 第一层提醒
5. 进位加法完整演示
6. 退位减法——破十法
7. 退位减法——平十法
8. 临界题与边界题
9. 自动播放速度与手动控制
10. 完整结算、历史与订正闭环
11. 响应式尺寸验收（767 / 768 / 1024 / 1440px）
12. 控制台与运行状态检查

### 验收环境搭建

```bash
# 1. 检查工作区状态
git status -sb

# 2. 全量测试
npm test -- --run

# 3. 生产构建
npm run build

# 4. 启动本地 Vite 服务
npm start -- --host 127.0.0.1
```

用 playwright-cli 打开本地服务：

```bash
playwright-cli open http://127.0.0.1:5173/that-math-things/
```

### 场景执行过程

每个场景的基本操作模式：

```bash
# Step 1: 获取页面快照，确认当前路由
playwright-cli snapshot

# Step 2: 定位并交互
playwright-cli click "getByText('计算训练')"

# Step 3: 检查交互结果
playwright-cli snapshot

# Step 4: 读取控制台
playwright-cli console warning
playwright-cli console error
```

**示例：验证进位加法演示（场景 4.5）**

```bash
# 设置运算参数后开始训练，找到进位题（如 19+24）
playwright-cli click "getByText('需要提示')"
playwright-cli snapshot                                   # 检查第一层提醒内容
playwright-cli click "getByText('看看计算方法')"
playwright-cli snapshot                                   # 第一步：加数分十位个位显示

playwright-cli click "getByText('下一步')"
playwright-cli snapshot                                   # 第二步：个位合并

playwright-cli click "getByText('下一步')"
playwright-cli snapshot                                   # 第三步：满十进一

playwright-cli click "getByText('下一步')"
playwright-cli snapshot                                   # 第四步：十位融合

playwright-cli click "getByText('上一步')"                # 验证回退
playwright-cli click "getByText('重播')"                  # 验证重播
```

**示例：响应式尺寸验收（场景 4.11）**

```bash
# 767px：应显示拦截层
playwright-cli resize 767 800
playwright-cli snapshot
playwright-cli find "目前网站只支持电脑和 Pad 访问"

# 768px：拦截层消失
playwright-cli resize 768 800
playwright-cli snapshot

# 1024px：内容完整
playwright-cli resize 1024 768
playwright-cli snapshot

# 1440px：内容居中
playwright-cli resize 1440 900
playwright-cli snapshot
```

### 实际题目记录

验收中遇到的实际题目（随机生成）：

| 题型 | 题目 | 辅助方法 |
|:---|:---|:---|
| 进位加法 | `19+24` | 凑十法 |
| 退位减法 | `32-24` | 破十法 |
| 退位减法 | `12-4` | 平十法（步骤：12−2=10, 10−2=8） |
| 边界题 | `18+2` | 个位和为 10，属于真实进位 |
| 边界题 | `10-3` | 被减数为 10，减法辅助正常 |
| 简单题 | `5+3` | 不进位，不显示辅助入口 |

### 控制台与尺寸矩阵

**控制台检查节点（全部通过，0 error / 0 warning）：**

- 首页首次加载
- 展开进位完整演示后
- 展开退位完整演示后
- 刷新练习页后
- 进入结算页后
- 完成订正后

**响应式尺寸矩阵：**

| 视口 | 结果 |
|:---|:---|
| 767px | 拦截层正确显示 |
| 768px | 拦截层消失，应用恢复 |
| 1024px | 内容完整，无横向滚动 |
| 1440px | 内容居中，不被无意义拉伸 |

### 最终交付物

| 产出 | 说明 |
|:---|:---|
| 验收记录文档 | `phase7-真实浏览器验收与体验收尾.md`（含完整操作步骤与结果断言） |
| README 状态更新 | Phase 7 标记为 ✅ 完成 |
| v2.4 发布 | Tag + GitHub Release 发布 |
| 本地开发服务 | 验收完成后已停止 |

**验收结论：12 个场景全部通过，0 个缺陷，控制台 0 error / 0 warning，生产构建通过。**
