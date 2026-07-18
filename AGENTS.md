# 那年那数那些事

React SPA（HashRouter + GitHub Pages），一个面向一年级数学错题的交互式学习应用。

## 快速开始

```bash
npm install
npm start        # Vite，浏览器打开 http://localhost:5173/that-math-things/
npm test         # Vitest
npm run build    # 产物到 build/
npm run deploy   # gh-pages 发布到 GitHub Pages
```

## 路由

HashRouter（`index.jsx`），所有路径相对于 `/#/`：

| 路径 | 页面 |
|---|---|
| `/` | 首页（v2.0 改成两个入口卡片） |
| `/problems` | 错题列表 |
| `/problems/:id` | 题目详情（3 种模式） |
| `/practice` | v2.0 计算训练参数调整 |
| `/practice/session` | v2.0 做题页 |
| `/practice/result` | 结算与综合评价 |
| `/practice/stats` | 历史统计 |
| `/practice/correction` | 错题订正 |

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
- 在 `components/animations/<Name>/index.jsx`，接收 `{ params, onComplete }`
- 用 `motion.div`（非 SVG）+ framer-motion 属性动画
- 自动 `setTimeout` 推进 step，播完显示「继续」按钮
- 可选语音播报（`window.speechSynthesis`，`lang: 'zh-CN'`, `rate: 0.85`）

## 技术栈细节

| 项 | 内容 |
|---|---|
| 框架 | Vite 6 + React 19 |
| UI | Ant Design 6 + 中文 locale（`ConfigProvider locale={zhCN}`） |
| 路由 | react-router-dom v6 + HashRouter |
| 动画 | framer-motion 12（`motion.div`） |
| 测试 | Vitest（测试文件 `*.test.js(x)` 与被测文件同级） |
| 部署 | `homepage: https://soapgu.github.io/that-math-things`、gh-pages |
| 提交 | `git-cz --non-interactive --type <type> --scope <scope> --subject "<subject>"` |
| 发布 | `gh release create <tag> --title "<title>" --generate-notes` |
| 存储 | v2.0 数据用 localStorage |

## 版本计划

v2.0-v2.2 已完成计算训练、结算订正、统计和综合评价；v2.3 为工程质量优化，v2.4 规划辅助运算（凑十法/破十法/平十法分步引导）。

需修改的文件：
- `src/App.jsx` → 路由配置和页面级懒加载
- `src/components/AppLayout/index.jsx` → 全局导航
- `src/pages/Home/index.jsx` → 入口卡片
- `src/pages/Practice/*/index.jsx` → 计算训练各页面
- 新增 `src/utils/mathGenerator.js`, `src/utils/storage.js`
- 新增 `src/hooks/useTimer.js`
