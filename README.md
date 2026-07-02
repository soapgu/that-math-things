# 那年那数那些事

> 一个帮助一年级小朋友攻克数学易错题的交互式学习网站。

通过**图形动画 + 分步引导**的方式，把每道错题的思维过程可视化，配合随机换参反复练习，真正搞懂而不是背答案。

---

## 目录

- [技术栈](#技术栈)
- [功能概览](#功能概览)
- [交互模式详解](#交互模式详解)
- [错题目录](#错题目录)
- [随机参数范围](#随机参数范围)
- [目录结构](#目录结构)
- [开发指南](#开发指南)
  - [环境准备](#环境准备)
  - [启动项目](#启动项目)
  - [目录说明](#目录说明)
  - [如何新增一道题](#如何新增一道题)
- [构建部署](#构建部署)
- [更新步骤](#更新步骤)

---

## 技术栈

| 类别 | 选择 |
| --- | --- |
| 框架 | Create React App (React 18) |
| 语言 | JavaScript (ES6+) |
| UI 组件库 | Ant Design 5 |
| 路由 | react-router-dom v6 |
| 动画 | framer-motion + CSS Animations |
| 图形 | 原生 SVG |

---

## 功能概览

### 页面

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 错题入口卡片，展示所有题目 |
| `/problems` | 题目列表 | 按知识点分类展示 |
| `/problems/:id` | 题目详情 | 三种互动模式切换 + 随机换参 |

### 三种互动模式

每道题都支持以下三种模式，顶部标签切换：

| 模式 | 交互流程 |
| --- | --- |
| **直接答题** | 显示题目 → 输入答案 → 提交判对错 → 显示结果 |
| **查看提示** | 显示思考指引文字（思路点拨） |
| **辅助解题** | 见下方详解 |

---

## 交互模式详解

### 辅助解题状态流

```
开始
  │
  ▼
自动播放动画演示（可暂停/重播）
  │
  ▼
展示解题步骤 1 ────→ 填写中间结果 1
  │                      ✓ 完成
  ▼
展示解题步骤 2 ────→ 填写中间结果 2
  │                      ✓ 完成
  ▼
  ...
  │
  ▼
展示解题步骤 n ────→ 填写最终答案
                         │
                    ┌────┴────┐
                    ▼         ▼
                  正确 ✅   错误 ❌
                   完成    → 提示引导 → 重新填写最终答案
                                    │
                                    ▼
                                 正确 ✅ 完成
```

**关键规则：**
- 动画自动播放，用户可暂停/重播
- 每一步的中间结果填写完成后才可进入下一步
- 中间结果填错时即时提示，但不阻塞流程（引导正确值）
- 最终答案答错时给出引导提示，允许重新填写，直到答对
- 随时可点击「随机换参」重新生成题目参数

### 直接答题状态流

```
显示题目 → 随机参数已生成 → 输入答案 → 提交
  ├─ 正确 ✅ 显示正确 + 简要解释
  └─ 错误 ❌ 显示正确答案 + 简要解释
```

### 查看提示状态流

```
显示题目 → 点击「查看提示」→ 显示思路文字
  → 用户可切到直接答题或辅助解题继续
```

---

## 错题目录

### MVP 4 道题（一年级）

| # | 题目 | 核心易错点 | 动画表现 |
| --- | --- | --- | --- |
| 1 | **电脑编号**：学校新买一批电脑，从 X 号编到 Y 号（≤100），一共新买了多少台？ | 知道 Y-X 后忘记 +1（端点问题） | 数轴高亮标记 X~Y，圆点逐个闪烁计数 |
| 2 | **贴纸问题**：乐乐有 A 张，欢欢有 B 张。①欢欢再添几张两人同样多？②乐乐每天送欢欢 1 张，几天后同样多？ | 两问混为一谈，第二问忘记每天差减少 2 张 | 贴纸卡片从乐乐流向欢欢的动画 |
| 3 | **吃苹果**：妈妈买了 N 个苹果，吃掉一些后剩下的不满 7 个，至少吃了几个？ | "不满 7" 理解为 ≤6，总量减去 6 得"至少" | 苹果逐个减少直到剩余 ≤6 时停止 |
| 4 | **增减问题**：第一天从篮子里拿掉 A 个苹果，第二天放进去 B 个，现在篮子里多/少几个？ | 方向判断错误（多/少），结果算错 | 篮子中苹果增减的直观动画 |

---

## 随机参数范围

| 题号 | 参数 | 范围 | 约束 |
| --- | --- | --- | --- |
| 1 | X, Y | X ∈ [1,80], Y ∈ [X+1, 100] | 整数 |
| 2 | A(乐乐), B(欢欢) | A ∈ [12,30], B ∈ [2, A-2] | 整数，保证差 ≥2 |
| 3 | N(总数) | N ∈ [10,20] | 整数 |
| 4 | A(拿掉), B(放进) | A ∈ [1,10], B ∈ [A+2, A+15] | 整数，保证变化 ≥2 |

每次切换模式或点击「随机换参」时重新生成参数。

---

## 目录结构

```
that-math-things/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/            # 通用组件
│   │   ├── AppLayout/         # 页面布局 (Header/Sider/Content)
│   │   ├── MathFormula/       # 公式渲染（一年级暂不需要，预留）
│   │   ├── ProblemCard/       # 题目卡片（首页/列表使用）
│   │   └── animations/        # 每道题的 SVG 动画组件
│   │       ├── ComputerNumber/   # 题1 电脑编号
│   │       ├── StickerProblem/   # 题2 贴纸问题
│   │       ├── AppleEaten/       # 题3 吃苹果
│   │       └── BasketChange/     # 题4 增减问题
│   ├── pages/                 # 页面
│   │   ├── Home/              # 首页
│   │   ├── Problems/          # 题目列表
│   │   └── ProblemDetail/     # 题目详情（三种模式）
│   ├── problems/              # 题目数据定义
│   │   ├── registry.js        # 题目注册表
│   │   └── data/              # 每题的定义 + 参数生成器
│   │       ├── computerNumber.js
│   │       ├── stickerProblem.js
│   │       ├── appleEaten.js
│   │       └── basketChange.js
│   ├── hooks/                 # 自定义 Hooks
│   │   └── useGuidedSolve.js  # 辅助解题状态机
│   ├── utils/
│   │   └── random.js          # 随机参数生成工具
│   ├── App.js                 # 路由配置
│   └── index.js               # 入口
├── .gitignore
├── package.json
└── README.md
```

---

## 开发指南

### 环境准备

- Node.js >= 16
- npm >= 8

### 启动项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 浏览器打开 http://localhost:3000
```

### 如何新增一道题

1. 在 `src/problems/data/` 下新建文件，按以下模板定义：

```javascript
// src/problems/data/yourProblem.js
const createProblem = (getRandomInt) => {
  // 1. 生成随机参数
  const param1 = getRandomInt(1, 10);
  const param2 = getRandomInt(1, 10);
  
  // 2. 计算答案
  const answer = param1 + param2;
  
  // 3. 分步引导数据（数组，每步包含 { description, hint, answer }）
  const steps = [
    { description: '第一步的描述', hint: '提示文字', answer: '中间结果1' },
    { description: '第二步的描述', hint: '提示文字', answer: '中间结果2' },
  ];
  
  const finalAnswer = answer;
  
  return { params: { param1, param2 }, answer, steps, finalAnswer };
};

export default {
  id: 'your-problem',
  title: '题目标题',
  tags: ['知识点标签'],
  createProblem,
};
```

2. 在 `src/problems/registry.js` 中注册：

```javascript
import yourProblem from './data/yourProblem';

const problemRegistry = {
  'your-problem': yourProblem,
  // ... 已有题目
};
```

3. 在 `src/components/animations/` 下创建动画组件。

4. 在 `src/pages/ProblemDetail/` 的三模式组件中引用。

---

## 构建部署

```bash
# 构建生产版本
npm run build

# 产物在 build/ 目录，可直接部署到任何静态服务器
```

---

## 更新步骤

### 日常开发更新

```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖（如有 package.json 变更）
npm install

# 3. 启动开发服务器
npm start
```

### 新增题目后的检查清单

- [ ] `src/problems/data/` 下新建了题目定义文件
- [ ] `src/problems/registry.js` 中注册了新题目
- [ ] `src/components/animations/` 下创建了对应的动画组件
- [ ] 题目在首页和列表页正常展示
- [ ] 三种互动模式均可正常使用
- [ ] 随机换参功能正常
- [ ] `npm start` 无报错

### 部署更新

```bash
# 1. 构建
npm run build

# 2. 将 build/ 目录部署到服务器（根据实际部署方式）
# 例如部署到 Vercel / Netlify / Nginx 等

# 3. 验证线上访问正常
```

### Git 工作流

```bash
# 新功能分支
git checkout -b feat/xxx-problem

# 开发完成后
git add .
git commit -m "feat: 新增 xxx 题目"
git checkout main
git merge feat/xxx-problem
git push
```

---

## 项目命名

- 中文名：**那年那数那些事**
- 英文名：`that-math-things`
- 域名（预留）：`thatmaththings.com`

---

*让数学不再可怕，让错题不再反复。*
