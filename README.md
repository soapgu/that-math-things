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
| 框架 | Create React App (React 19) |
| 语言 | JavaScript (ES6+) |
| UI 组件库 | Ant Design 6 |
| 路由 | react-router-dom v6 |
| 动画引擎 | framer-motion |
| 图形 | `motion.div` + CSS（非 SVG，用 DOM 元素配合 framer-motion 属性动画实现） |

---

## 功能概览

### 页面

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 首页 | 两个入口卡片：错题列表 / 计算训练 |
| `/problems` | 题目列表 | 按知识点分类展示 |
| `/problems/:id` | 题目详情 | 三种互动模式切换 + 随机换参 |
| `/practice` | 计算训练参数 | 调整运算范围/比例/概率/辅助运算/题数 |
| `/practice/session` | 计算训练做题 | 计时 + 随机出题 + 提交下一题 |
| `/practice/result` | 结算页 | 批改得分 + 错误分析 + 逐题详情 |
| `/practice/stats` | 统计数据 | 历史记录 + 错误分布统计 |

### 三种互动模式

每道题都支持以下三种模式，顶部标签切换：

| 模式 | 交互流程 |
| --- | --- |
| **直接答题** | 显示题目 → 输入答案 → 提交判对错 → 显示结果。支持单答案/多答案、文本输入/选择题（Radio）混合，多答案回车自动跳空或提交。 |
| **查看提示** | 显示思考指引文字（思路点拨） |
| **辅助解题** | 见下方详解 |

---

## 交互模式详解

### 辅助解题状态流

```
开始
  │
  ▼
自动播放动画演示
  │
  ▼
进入步骤时间线（所有步骤同时可见）
  ┌──────────────────────────────────────┐
  │ ✅ 第 1 步（已完成）  你的答案：13 ✓  │
  │ ✅ 第 2 步（已完成）  你的答案：5  ✓  │
  │ ▶ 第 3 步 ← 当前                    │
  │    ┌─────────────────────┐           │
  │    │  [输入框]    [确认] │           │
  │    └─────────────────────┘           │
  │ ○ 第 4 步（等待）                    │
  └──────────────────────────────────────┘
       │ 每步确认正确 → 自动跳到下一步
       │ 最后一步正确 → 显示完成
       │ 任何一步错误 → 原地重填
       ▼
全部答对 ✅ → 展示所有步骤结果 + 庆祝
```

**关键规则：**
- 动画自动播放，可跳过
- 所有步骤同时显示在时间线中，已完成/当前/未到一目了然
- 每步正确后输入框自动聚焦到下一步
- 任何一步答错，保留输入框可重填，不阻塞流程
- 最后一步正确即完成全部，无独立的"最终答案"阶段
- 随时可点击「重新开始」或「随机换参」

### 直接答题状态流

```
显示题目 → 随机参数已生成 → 填写答案 → 提交
  ├─ 正确 ✅ 显示正确 + 简要解释
  └─ 错误 ❌ 显示正确答案 + 简要解释
```

**扩展功能：**
- **多答案**：支持一道题有多个填空（如增减问题的"填方向 + 填数量"），每空独立判对错
- **选择题**：答案类型支持 `choice`，渲染为 Ant Design `Radio.Group`，选项可自定义标签和值
- **回车跳空**：多答案时按 Enter，如有空输入则自动跳到下一个空位，全部填满才提交
- **自动聚焦**：首次进入或随机换参后，自动聚焦第一个输入框（支持 Text / Radio）

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
| 1 | **电脑编号** | 端点问题（Y-X 后忘记 +1） | Y 个圆点→前 X 个变蓝→Y-X 个变橙→第 X 号绿色弹入 |
| 2 | **贴纸问题** | 两步混淆 | [待实现] |
| 3 | **吃苹果** | "不满"理解 | [待实现] |
| 4 | **增减问题** | 增减方向 | [待实现] |

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
│   ├── components/                    # 通用组件
│   │   ├── AppLayout/                 # 页面布局 (Header/Content)
│   │   ├── ProblemCard/               # 题目卡片（首页/列表使用）
│   │   └── animations/                # 每道题的可视化动画（motion.div + framer-motion）
│   │       ├── ComputerNumber/        # 题1 电脑编号
│   │       ├── StickerProblem/        # 题2 贴纸问题
│   │       ├── AppleEaten/            # 题3 吃苹果
│   │       └── BasketChange/          # 题4 增减问题
│   ├── pages/                         # 页面
│   │   ├── Home/                      # 首页（两个入口卡片）
│   │   ├── Problems/                  # 题目列表
│   │   ├── ProblemDetail/             # 题目详情（三种模式）
│   │   └── Practice/                  # v2.0 计算训练
│   │       ├── Settings/              # 参数调整页
│   │       ├── Session/               # 做题页
│   │       ├── Result/                # 结算页
│   │       └── Stats/                 # 统计数据页
│   ├── problems/                      # 题目数据定义
│   │   ├── registry.js                # 题目注册表
│   │   └── data/                      # 每题的定义 + 参数生成器
│   │       ├── computerNumber.js
│   │       ├── stickerProblem.js
│   │       ├── appleEaten.js
│   │       └── basketChange.js
│   ├── hooks/                         # 自定义 Hooks
│   │   ├── useGuidedSolve.js          # 辅助解题状态机
│   │   └── useTimer.js                # v2.0 计时器
│   ├── utils/
│   │   ├── random.js                  # 随机参数生成工具
│   │   ├── mathGenerator.js           # v2.0 计算题生成器
│   │   ├── marking.js                 # v2.0 批改引擎
│   │   └── storage.js                 # v2.0 localStorage 存储
│   ├── App.js                         # 路由配置
│   └── index.js                       # 入口
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

# 运行测试（TDD）
npm test

# 浏览器打开 http://localhost:3000
```

### 如何新增一道题

1. 在 `src/problems/data/` 下新建文件，按以下模板定义：

```javascript
// src/problems/data/yourProblem.js
import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  // 1. 生成随机参数
  const param1 = getRandomInt(1, 10);
  const param2 = getRandomInt(1, 10);
  const finalAnswer = param1 + param2;

  // 2. 直接答题的答案定义
  //    - 单答案：answers 数组长度 1
  //    - 多答案：answers 数组长度 > 1，每项独立 label + 判对错
  //    - 选择题：设置 type: 'choice' + options 数组
  const answers = [
    { label: '答案一', answer: finalAnswer },
    { label: '答案二', answer: 5, type: 'choice', options: [
      { label: '选项A', value: 5 },
      { label: '选项B', value: 10 },
    ]},
  ];

  // 3. 分步引导数据
  //    最后一步的 answer 就是最终答案
  const steps = [
    { description: '第一步的题干', hint: '提示文字', answer: '中间结果1' },
    { description: '第二步的题干', hint: '提示文字', answer: '中间结果2' },
    { description: '最终步的题干', hint: '提示文字', answer: finalAnswer },
  ];

  return {
    params: { param1, param2 },
    question: '完整的题目文字，支持 ${param1} 插值',
    hint: '查看提示模式显示的整体思路',
    answers,
    steps,
    finalAnswer,
  };
};

const problem = {
  id: 'your-problem',
  title: '题目标题',
  tags: ['知识点标签'],
  createProblem,
};

export default problem;
```

2. 在 `src/problems/registry.js` 中注册：

```javascript
import yourProblem from './data/yourProblem';

const problemRegistry = {
  'your-problem': yourProblem,
  // ... 已有题目
};
```

3. 在 `src/components/animations/` 下创建动画组件（详见下方「动画组件开发指南」）。

4. 在 `src/pages/ProblemDetail/index.js` 的 `AnimationRenderer` 中添加映射：

```javascript
function AnimationRenderer({ problemId, params, onComplete }) {
  switch (problemId) {
    case 'computer-number':
      return <ComputerNumberAnimation params={params} onComplete={onComplete} />;
    case 'your-problem':
      return <YourProblemAnimation params={params} onComplete={onComplete} />;
    // ...
  }
}
```

---

### 动画组件开发指南

动画组件的核心原理是 **状态驱动 + 属性动画**：用 `step` 状态推进时间线，通过 framer-motion 的 `motion.div` 在不同步骤间自动补间过渡。

#### 组件接口

每道题的动画组件接收统一的 props：

```javascript
function YourProblemAnimation({ params, onComplete }) {
  // params:   { key1, key2, ... }  ← 由 createProblem 返回的随机参数
  // onComplete: () => void         ← 动画播放完毕回调，调用后进入步骤填写
}
```

#### 基本结构

```javascript
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from 'antd';

export default function YourProblemAnimation({ params, onComplete }) {
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 4;

  // 1. 定时器推进 step
  useEffect(() => {
    if (step < TOTAL_STEPS) {
      const delay = step === 0 ? 2400 : 6600;
      const timer = setTimeout(() => setStep((s) => s + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // 2. 渲染视觉元素
  return (
    <div>
      {elements.map((el) => (
        <motion.div
          key={el.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            backgroundColor: step >= 2 ? '#1677ff' : '#b0b0b0',
            x: step >= 3 ? 100 : 0,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 14 }}
        />
      ))}

      {/* 3. 所有步骤播完显示继续按钮 */}
      {step >= TOTAL_STEPS && (
        <Button type="primary" onClick={onComplete}>继续</Button>
      )}
    </div>
  );
}
```

#### 常用动画技巧

| 效果 | 实现方式 |
| --- | --- |
| **逐步出现** | `delay: (index) * 35ms` |
| **弹跳进入** | `scale: [0, 1.5, 1]`（关键帧数组） |
| **颜色跳变** | 改变 `backgroundColor`，framer-motion 自动补间 |
| **位置移动** | 改变 `x` / `y` 属性 |
| **大小变化** | 改变 `width` / `height` |
| **高亮强调** | 组合 `border`、`boxShadow`、`zIndex` 变化 |
| **闪烁动画** | `animate={{ scale: [1, 1.2, 1] }}` + `transition.repeat` |
| **布局平滑** | `layout` prop 让布局变化自动过渡 |

#### 重要说明

动画并非使用 `<svg>` 元素绘制，而是用 **`motion.div` + CSS** 模拟：
- 每个视觉单元是一个 `motion.div`，通过 `borderRadius` 控制形状
- 布局用 `display: flex` + `flexWrap` 实现排列
- 所有动画由 framer-motion 的 `animate` prop 驱动

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

---

## v2.0 规划

### 背景

在现有错题训练的基础上，新增「计算训练」模块，覆盖一年级核心的加减法计算能力训练。

### 路由设计

| 路径 | 页面 | 说明 |
|---|---|---|
| `/` | **首页入口** | 改为两个入口卡片：错题列表 / 计算训练 |
| `/problems` | 错题列表 | 保留不动 |
| `/problems/:id` | 错题详情 | 保留不动 |
| `/practice` | **参数调整页** | 设置运算范围/比例/概率/辅助运算等 |
| `/practice/session` | **做题页** | 随机出题，提交即下一题 |
| `/practice/result` | **结算页** | 百分制批改+错误分析+用时 |
| `/practice/stats` | **统计数据页** | 历史记录+排行榜+错误分布 |

### 新增文件清单

```
src/
├── pages/
│   ├── Home/index.js              ← 改造：会话故事 → 两个入口卡片
│   └── Practice/
│       ├── Settings/index.js      ← 新增：参数调整页
│       ├── Session/index.js       ← 新增：做题页
│       ├── Result/index.js        ← 新增：结算页
│       └── Stats/index.js         ← 新增：统计数据页
├── components/
│   └── AppLayout/index.js         ← 改造：导航栏加「计算训练」
├── utils/
│   ├── mathGenerator.js           ← 新增：计算题生成器
│   └── storage.js                 ← 新增：localStorage 存储
└── hooks/
    └── useTimer.js                ← 新增：计时器 hook
```

### 参数调整页

| 参数 | 控件 | 说明 |
|---|---|---|
| 运算范围 | InputNumber | 默认 50，可调 10-100 |
| 加法比例 | Slider 0-100% | 剩余为减法 |
| 进位退位概率 | Slider 0-100% | 涉及进位/退位的题占比 |
| 辅助运算 | Switch | 开启后展示分步引导（破十法/平十法） |
| 破十法 / 平十法 | Radio（二选一） | 辅助运算开启时可选 |
| 题目数量 | InputNumber | 默认 10，可调 5-100 |

### 做题流程

```
开始 → 生成题目 → 启动计时
                  ↓
            ┌─────────────┐
            │  a ± b = ?  │
            │  [输入框]    │
            │  [下一题]    │
            └──────┬──────┘
                   ↓ 提交
            ┌─────────────┐
            │ 辅助运算 ON? │
            ├───YES───┬───NO───┐
            │ 展示分步 │ 直接   │
            │ 引导弹窗 │ 跳转   │
            │ 点击继续 │        │
            └─────────┴────────┘
                   ↓
              下一题 / 结束 → /practice/result
```

### 结算页

- 百分制得分：`正确数 / 总数 × 100`
- 总用时显示
- 错误分析标签：错误类型 × 次数展示
- 逐题详情：题目、用户答案（划线）、正确答案、对错标记、错误标签 + 点评文案
- 存储空间不足自动清理最旧 100 条并提示
- 「再来一次」「统计数据」「返回首页」按钮
- 自动保存记录到 localStorage

### 统计数据页

- 总练习次数、总题数、平均分、最高分
- 累计错误分布（退位错误 / 进位错误 / 计算错误 + 占比柱状图）
- 最近历史记录列表
- 清除数据（需确认）

### 数据存储

使用 `localStorage`，结构：

```js
{
  records: [
    {
      id, date, score, total, correct, wrongCount,
      timeSpent, settings,
      questions: [ /* 原题数据 */ ],
      userAnswers: [ /* 用户答案 */ ],
      results: [
        { isCorrect, errors: string[], detail: string|null }
      ]
    }
  ]
}
```

### 分阶段实施

#### ✅ Phase 1：基础设施 + 参数调整 + 基础做题

| 步骤 | 内容 | 状态 |
|---|---|---|
| 1a | 路由新增 `/practice` 系列 + 导航栏「计算训练」+ 首页改造为两个入口卡片 | ✅ |
| 1b | 参数调整页（范围/比例/概率/数量 + 辅助运算开关 + 破十法/平十法） | ✅ |
| 1c | `mathGenerator.js` 题目生成器 + `useTimer.js` 计时器 | ✅ |
| 1d | 基础做题页（无辅助运算，提交→直接下一题） | ✅ |

#### ✅ Phase 2：结算 + 错误分析

| 步骤 | 内容 | 状态 |
|---|---|---|
| 2a | `storage.js` 数据存储 + `marking.js` 批改引擎 | ✅ |
| 2b | 结算页（分数/用时/逐题批改/错误原因分类），形成完整训练闭环 | ✅ |

#### Phase 3：辅助运算 + 破十法/平十法

| 步骤 | 内容 |
|---|---|
| 3a | 做题页集成辅助运算 + 加法进位分步引导 |
| 3b | 减法破十法/平十法分步引导 |

#### Phase 4：统计数据页

| 步骤 | 内容 |
|---|---|
| 4a | 统计数据页（错误分布统计 + 历史记录排行 + 清除数据） |

### v2.1 规划

| 目标 | 说明 |
|---|---|
| 严重错误判定 | 答案与正确结果偏差过大时触发"严重错误"分类，与现有精细分类并行 |
| 订正功能 | 结算页支持对错题进行订正重做 |

> 设计与计划待后续补充。
