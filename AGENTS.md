# 那年那数那些事

React SPA（HashRouter + GitHub Pages），一个面向一年级数学错题的交互式学习应用。

## 快速开始

```bash
npm install
npm start        # 执行 scripts/dev.sh，自动打开 http://localhost:3000/that-math-things/
npm test         # react-scripts test（Jest）
npm run build    # 产物到 build/
npm run deploy   # gh-pages 发布到 GitHub Pages
```

## 路由

HashRouter（`index.js`），所有路径相对于 `/#/`：

| 路径 | 页面 |
|---|---|
| `/` | 首页（v2.0 改成两个入口卡片） |
| `/problems` | 错题列表 |
| `/problems/:id` | 题目详情（3 种模式） |
| `/practice` | v2.0 计算训练参数调整 |
| `/practice/session` | v2.0 做题页 |

## 题目架构

### 注册表模式
- `problems/registry.js` → `getProblem(id)`, `getAllProblems()`
- 每道题在 `problems/data/` 下一个文件，export `{ id, title, tags, createProblem }`
- `createProblem()` 返回 `{ params, question, hint, steps, answers, finalAnswer }`
- 新增题目：建 data 文件 → registry 注册 → 建动画组件 → ProblemDetail 的 `AnimationRenderer` 加映射

### 三步交互模式（ProblemDetail）
- **直接答题**：`answers[]` 支持单/多答案、`type: 'choice'` 选择题、回车跳空
- **查看提示**：显示 `hint` 文字
- **辅助解题**：`useGuidedSolve` 状态机（IDLE→ANIMATION→STEP_INPUT→CORRECT）+ `steps[]` 分步引导

### 动画组件
- 在 `components/animations/<Name>/index.js`，接收 `{ params, onComplete }`
- 用 `motion.div`（非 SVG）+ framer-motion 属性动画
- 自动 `setTimeout` 推进 step，播完显示「继续」按钮
- 可选语音播报（`window.speechSynthesis`，`lang: 'zh-CN'`, `rate: 0.85`）

## 技术栈细节

| 项 | 内容 |
|---|---|
| 框架 | Create React App (React 19) |
| UI | Ant Design 6 + 中文 locale（`ConfigProvider locale={zhCN}`） |
| 路由 | react-router-dom v6 + HashRouter |
| 动画 | framer-motion 12（`motion.div`） |
| 测试 | react-scripts test（Jest，测试文件 `*.test.js` 与被测文件同级） |
| 部署 | `homepage: https://soapgu.github.io/that-math-things`、gh-pages |
| 提交 | `git-cz --non-interactive --type <type> --scope <scope> --subject "<subject>"` |
| 发布 | `gh release create <tag> --title "<title>" --generate-notes` |
| 存储 | v2.0 数据用 localStorage |

## v2.0 计划

见 README「v2.0 规划」章节，分 4 个 Phase 实施：
1. 基础设施 + 参数调整 + 基础做题
2. 结算 + 错误分析
3. 辅助运算（破十法/平十法分步引导）
4. 统计数据页

需修改的文件：
- `src/App.js` → 新增路由
- `src/components/AppLayout/index.js` → 导航加「计算训练」
- `src/pages/Home/index.js` → 改造为入口卡片
- 新增 `src/pages/Practice/{Settings,Session,Result,Stats}/index.js`
- 新增 `src/utils/mathGenerator.js`, `src/utils/storage.js`
- 新增 `src/hooks/useTimer.js`
