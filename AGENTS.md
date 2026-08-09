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
| `/multiplication` | 九九乘法统一设置（闯关/背诵 Tab） |
| `/multiplication/session` | 九九乘法闯关做题页 |
| `/multiplication/result` | 九九乘法闯关结算页 |
| `/multiplication/recitation` | 九九乘法口诀背诵页 |

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

v2.0–v2.6.0 已完成并发布。v2.6.0“九九乘法闯关”八个步骤全部完成；v2.7“九九乘法口诀背诵”步骤1至步骤6已完成，下一步进入步骤7“测试与体验验收”。背诵复用共享坐标能力与现有页面框架，但采用独立`/multiplication/recitation`路由、状态机、存储和双表组件，原闯关矩阵保持不变。生产流程已覆盖顺序背、自定义背、刷新恢复、重新开始、异常降级、语音生命周期、焦点和完成柔光。视觉方向与v2.6同体系但更安静：品牌蓝表示当前，青绿色表示已背；1440/1920采用1400px居中、严格等高和10行逐线对齐的双表布局，768/1024保持上下排列。阶段记录见 [STEP.md](./STEP.md)，v2.7规格见 [docs/v2.7-九九乘法口诀背诵实施计划.md](./docs/v2.7-九九乘法口诀背诵实施计划.md)，技术边界见 [docs/v2.7-九九乘法口诀背诵技术原型与基础模型.md](./docs/v2.7-九九乘法口诀背诵技术原型与基础模型.md)。
