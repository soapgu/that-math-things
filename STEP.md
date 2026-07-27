# 版本演进与历史步骤存档

> 记录每个版本的阶段性工作、实施拆分、验收标准。
>
> - 当前生效的功能规格：见 [README.md](./README.md)
> - Phase 8 E2E 实施计划：见 [docs/phase8-e2e-implementation-plan.md](./docs/phase8-e2e-implementation-plan.md)
> - Phase 7 验收清单：见 [docs/phase7-真实浏览器验收与体验收尾.md](./docs/phase7-真实浏览器验收与体验收尾.md)

---

## v2.3 工程质量优化

本版本优先偿还工程技术债，为后续辅助运算功能提供更稳定的基础。

| 项目 | 调整内容 |
|---|---|
| 首屏性能 | 路由页面改为 `React.lazy` 按页加载，避免一次加载全部业务页面 |
| 图表体积 | ECharts 改为按需注册折线图、饼图、雷达图及所需组件 |
| 构建基线 | 独立缓存块告警阈值设为 600 KB；超过当前 Ant Design/ECharts 基线时继续告警 |
| 路由兼容 | 启用 React Router v7 future flags，提前适配状态更新和相对路径行为 |
| Ant Design 兼容 | `Statistic.valueStyle` 迁移至 `styles.content`，弃用的 `List` 改为语义化列表结构 |
| 文档同步 | 更新 Vite、Vitest、`.jsx` 文件、订正路由和当前版本规划 |

---

## v2.4 辅助运算分步引导

### 设计目标

v2.4 提供按需辅助运算：孩子遇到进位或退位困难时主动求助，通过轻量提醒和数形结合演示唤回计算方法并加深记忆。辅助不是默认做题流程，不代替作答，目标是让孩子逐步减少提示并最终独立完成计算。

设计原则：

- **按需唤起**：只有用户点击辅助按钮后才展示提示，不自动打断做题。
- **聚焦难点**：只辅助确实涉及进位或退位的题目；是否进退位是唯一的难度资格标准。
- **由浅入深**：先给进退位提醒，仍然卡住时再展示完整方法。
- **遵循教材步骤**：加减法均按相同数位对齐、先算个位、再算十位、最后合并的顺序演示；退位后的个位可按设置选择破十法或平十法。
- **不提供依赖**：不自动填写、不自动提交、不因使用辅助直接扣分，动画结束后仍由孩子完成答案。
- **独立接入**：辅助模块只读取当前题目和设置，不改变出题、计时、批改与结算主流程。

### 功能范围

纳入辅助范围：

- 进位加法：按“个位相加—个位写结果—向十位进 1—十位相加”演示。
- 退位减法：按“十位退 1 到个位—个位相减—十位相减—合并结果”演示。
- 所有真实发生进位或退位的题目，包括结果正好是整十的 `9+1`、`18+2`。

不纳入辅助范围：

- 不进位加法和不退位减法。
- 不发生进位或退位的普通计算；这类题定义为本功能中的“过于简单”。
- 乘除法。
- 应用题已有的“辅助解题”模式；本功能仅服务于计算训练。

辅助资格由实际个位关系判断：个位和大于等于 10 即为进位，且被减数个位小于减数个位即为退位。结果是否正好为整十不影响资格。

### 设置页调整

保留 `assistEnabled`，并增加只作用于退位个位步骤的 `borrowOnesMethod`：

- `assistEnabled` 表示本次训练中允许主动求助，不表示每题自动展示分步引导。
- 辅助开关说明改为“做题时可主动查看进位、退位提示”。
- 加法固定使用教材中的数位进位步骤，不受该选项影响。
- 减法的退位重组、十位相减和最终合并保持一致，仅个位相减可选择破十法或平十法。
- 默认使用破十法；旧 `assistMethod: breakTen/flatTen` 自动迁移到新字段。
- 辅助关闭时保留但禁用方法选项，便于用户确认下次开启时采用的方法。

### 做题页入口

辅助入口仅在以下条件全部满足时出现：

```js
settings.assistEnabled &&
assistance.eligible
```

按钮放在题目输入区下方，建议使用灯泡图标和“需要提示”文案：

- 使用浅色文字按钮或低强调描边按钮，不与“下一题”主按钮竞争注意力。
- 位置固定，保证孩子需要时能够找到。
- 不使用闪烁、呼吸动画、红色等容易干扰做题的表现。
- 切换到下一题时自动收起，辅助状态重新从未使用开始。

### 两层辅助流程

```text
独立思考
   ↓ 卡住后主动点击
第一层：进位/退位关键提醒
   ├─ 想起来了 → 返回原题作答
   └─ 仍然不会 → 点击“看看计算方法”
                      ↓
第二层：方法动画 + 进退位数位变化
                      ↓
                 返回原题作答
```

#### 第一层：关键提醒

只提醒风险点，不展开完整方法，也不显示最终答案。

进位题示例：

```text
个位相加超过了 10，记得向十位进 1。
想一想：个位 8 加 7 得多少？满十后个位写几，向十位进几？
```

退位题示例：

```text
个位的 5 不够减 8，需要从十位退 1。
退下来的 1 个十可以换成 10 个一。
```

提醒下方提供“我再想想”和“看看计算方法”，由孩子决定是否进入第二层。

#### 第二层：教材数位步骤演示

第二层严格按照教材图示，用十位和个位两个区域同步展示计算与数位变化。动画主体展示算式步骤，下方固定保留轻量的数位提示条：

- 进位：`10 个一换成 1 个十，向十位进 1 ↑`
- 退位：`从十位退 1，1 个十换成 10 个一 ↓`

进位建议使用橙色上箭头，退位建议使用蓝色下箭头；不使用红色，避免造成错误警告感。提示与发生数位变化的动画步骤同步高亮，但不持续闪烁。

### 数位进位加法演示

以教材中的 `27 + 5` 为规范示例：

1. 将两个加数按相同数位对齐，从个位算起。
2. 计算个位 `7 + 5 = 12`。
3. 个位写 2，并将 10 个一换成 1 个十，向十位进 1。
4. 计算十位：`2 + 1 = 3`，即 2 个十加进来的 1 个十，得到 3 个十。十位按“几个十”计算，不写成 `20 + 10 = 30`。
5. 将 3 个十和 2 个一合并为 32，但仍由孩子自己填写答案。

视觉上使用十位/个位表格、成捆小棒与单根小棒：个位 12 根中将 10 根捆成 1 个十并移动到十位，个位保留 2 根。

### 数位退位减法演示

以教材中的 `43 - 18` 为规范示例：

1. 个位 `3` 不够减 `8`，从十位退 1。
2. 1 个十换成 10 个一，把 43 看作 3 个十和 13 个一：`43 = 30 + 13`。
3. 先算个位：`13 - 8 = 5`，得到 5 个一。
4. 再算十位：`30 - 10 = 20`，得到 2 个十。
5. 最后合并：`20 + 5 = 25`。

视觉上使用十位/个位表格：十位移出 1 个十并在个位展开成 10 个一；个位划去 8 个一，十位划去 1 个十，最后合并剩余数量。

退位后的个位步骤根据设置选择方法。以 `12-4=8` 为例：

- 破十法：`10-4=6`，再算 `6+2=8`。
- 平十法：先算 `12-2=10`，再算 `10-2=8`。

两种方法只替换 `subtractOnes` 的内部动画阶段，不改变退位、十位相减、合并结果等顶层步骤。第一层提醒保持方法中立。

整十边界沿用同一规则。例如 `10 - 3`：

```text
把 10 看作 0 个十和 10 个一
10 - 3 = 7
0 - 0 = 0
0 + 7 = 7
```

选择平十法时，`10-3` 已经是整十，因此明确提示省略“先减到 10”，直接计算 `10-3=7`；选择破十法时省略无意义的“加回 0”。

### 辅助数据模型

新增纯计算模块，根据题目和设置生成辅助描述，不包含 React 或动画逻辑：

```js
createAssistance(question, settings)
```

建议返回结构：

```js
{
  eligible: true,
  kind: 'borrow',              // carry | borrow
  method: 'placeValueBorrow',  // placeValueCarry | placeValueBorrow
  onesMethod: 'bridgeTen',     // breakTen | bridgeTen，仅退位减法
  hint: {
    message: '个位的 3 不够减 8，需要从十位退 1。',
    question: '退下来的 1 个十可以换成多少个一？'
  },
  operands: {
    first: 43,
    second: 18,
    borrowedOnes: 13,
    remainingTensValue: 30,
    subtrahendTensValue: 10,
    onesResult: 5,
    tensResultValue: 20,
    answer: 25
  },
  steps: [
    { type: 'regroup', expression: '43 = 30 + 13' },
    {
      type: 'subtractOnes',
      expression: '13 - 8 = 5',
      strategy: {
        type: 'bridgeTen',
        subtractToTen: 3,
        remainingSubtract: 5,
        result: 5
      }
    },
    { type: 'subtractTens', expression: '30 - 10 = 20' },
    { type: 'combine', expression: '20 + 5 = 25' }
  ]
}
```

进位加法使用 `placeValueCarry`，退位减法使用 `placeValueBorrow`。两种模型都输出第一层 `hint`、计算中间值和严格排序的第二层动画步骤。`hint` 不在 `steps` 中重复；动画直接根据步骤的 `type`（如 `carry`、`regroup`）执行数位变化，也不再维护重复的 `placeValueAction`。

### 辅助使用记录

每道题的题目、答案、批改结果和辅助使用情况必须聚合在同一个对象中，避免 `questions[i] / userAnswers[i] / results[i] / assistUsage[i]` 依赖下标隐式关联。localStorage 的 `practice-records` 仍保存按时间倒序排列的练习记录数组，单场练习目标结构如下：

```js
{
  schemaVersion: 2,
  id: 1784505600000,
  date: '2026-07-20T10:00:00.000Z',
  timeSpent: 86,
  score: 67,
  total: 3,
  correct: 2,
  wrongCount: 1,
  settings: {
    range: 50,
    addRatio: 50,
    carryBorrowProb: 40,
    assistEnabled: true,
    borrowOnesMethod: 'bridgeTen',
    questionCount: 3
  },
  items: [
    {
      index: 0,
      question: {
        a: 19, b: 24, op: '+', answer: 43,
        hasCarry: true, hasBorrow: false
      },
      userAnswer: '43',
      result: { isCorrect: true, errors: [], detail: null },
      assistUsage: {
        eligible: true,
        kind: 'carry',
        used: true,
        level: 2,
        method: 'placeValueCarry',
        strategy: null
      }
    },
    {
      index: 1,
      question: {
        a: 32, b: 24, op: '-', answer: 8,
        hasCarry: false, hasBorrow: true
      },
      userAnswer: '6',
      result: {
        isCorrect: false,
        errors: ['借位错误', '平十/破十法计算错误'],
        detail: '个位计算错误'
      },
      assistUsage: {
        eligible: true,
        kind: 'borrow',
        used: true,
        level: 1,
        method: null,
        strategy: null
      }
    },
    {
      index: 2,
      question: {
        a: 18, b: 2, op: '+', answer: 20,
        hasCarry: true, hasBorrow: false
      },
      userAnswer: '20',
      result: { isCorrect: true, errors: [], detail: null },
      assistUsage: {
        eligible: true,
        kind: 'carry',
        used: false,
        level: 0,
        method: null,
        strategy: null
      }
    }
  ],
  evaluation: {
    difficulty: 3,
    accuracy: 4,
    speed: 3,
    composite: {
      totalStars: 4,
      grade: 'SR',
      comment: '表现不错，继续保持。'
    }
  }
}
```

- `eligible`：题目是否真实发生进位或退位。只有 `eligible: true` 才进入辅助依赖分析。
- `kind`：题目可使用的辅助类型，取 `carry | borrow | null`，不代表用户看过完整演示。
- `used`：等价于 `level > 0`，保留为查询便利字段，保存时必须与 `level` 保持一致。
- `level: 0`：明确记录为未使用辅助。
- `level: 1`：只查看进位或退位提醒，`method` 和 `strategy` 均为 `null`。
- `level: 2`：查看完整方法演示；`method` 记录 `placeValueCarry | placeValueBorrow`。
- `strategy`：仅在查看退位完整演示时记录 `breakTen | bridgeTen`，其他情况为 `null`。

旧记录没有辅助使用数据时，读取层统一转换为按题聚合的结构，但使用 `assistUsage: null` 表示“历史版本未记录”，不能转换成 `level: 0`。例如：

```js
{
  index: 0,
  question: oldRecord.questions[0],
  userAnswer: oldRecord.userAnswers[0],
  result: oldRecord.results[0],
  assistUsage: null
}
```

后续分析只统计 `assistUsage?.eligible === true` 的题目，以此计算独立完成率、只看提醒率和完整演示率；`assistUsage === null` 的旧数据不参与辅助依赖分析。

v2.4 暂不做复杂的辅助依赖统计，结算页只轻量展示“独立完成 / 查看提醒 / 查看方法”的题数。使用辅助不直接扣分，避免孩子为了得分拒绝求助。旧记录没有 `assistUsage` 时必须继续正常展示。

### 建议代码结构

```text
src/
├── components/
│   └── practice/
│       └── MathAssist/
│           ├── index.jsx
│           ├── index.test.jsx
│           ├── OneUnit.jsx
│           ├── TenBundle.jsx
│           ├── PlaceValueBoard.jsx
│           ├── PlaceValueBoard.test.jsx
│           ├── AssistAnimationPlayer.jsx
│           ├── CarryAnimation.jsx
│           ├── BorrowAnimation.jsx
│           └── Animations.test.jsx
├── utils/
│   ├── assistGenerator.js
│   ├── assistGenerator.test.js
│   ├── practiceSettings.js
│   ├── practiceSettings.test.js
│   ├── storage.js
│   └── storage.test.js
└── pages/
    └── Practice/
        ├── Settings/
        │   ├── index.jsx
        │   └── index.test.jsx
        ├── Session/
        │   ├── index.jsx
        │   └── index.test.jsx
        └── Result/
            ├── index.jsx
            └── index.test.jsx
```

模块职责：

- `assistGenerator.js`：判断辅助资格，计算个位、十位中间值并生成步骤数据。
- `MathAssist`：管理未展开、第一层提醒和第二层方法演示状态。
- `PlaceValueBoard`：复用十位/个位表格、上下操作数行、来源分组、成捆小棒、单根小棒及数位转换能力。
- `AssistAnimationPlayer`：统一三档步骤定时、前后切换、进度、跳过、重播及减少动态效果适配。
- 进位、退位动画：只消费步骤数据并映射数位表状态，保留两个操作数及进退位来源，不重复计算公式。
- `PracticeSession`：当前提供入口并在切题时重置状态；Phase 5 再接入辅助使用记录，不承载具体算法。
- `storage.js`：Phase 5 统一构建、规范化和兼容读取 schema v1/v2 练习记录。
- `PracticeResult`：Phase 5 只消费规范化后的 `items[]`，展示轻量辅助使用摘要。

### v2.4 实现拆分

#### ✅ Phase 1：辅助计算模型（已完成）

- 新增 `assistGenerator.js` 和单元测试。
- 完成辅助资格判断，只排除不进位、不退位的题目。
- 严格按教材示例实现数位进位加法与数位退位减法模型。
- 输出第一层 `hint`、计算中间值 `operands` 和严格排序的 `steps`。
- 覆盖 `27+5`、`43-18`、`10-3`、`100-18` 及随机题测试。
- 覆盖 `9+1`、`18+2` 等结果正好是整十但真实发生进位的题目。
- 资格判断基于实际操作数，不依赖可能过期的 `hasCarry`、`hasBorrow` 标记。

#### ✅ Phase 2：设置与第一层提醒（已完成）

- 修改设置页辅助开关说明，明确辅助需要在做题时主动点击。
- 初版曾移除尚未接入的破十法/平十法选择；Phase 4 完成动画后已恢复为减法专用设置。
- 在 Session 中加入低干扰的“需要提示”入口。
- 实现进位、退位第一层提醒和“看看计算方法”入口。
- 切题时重置辅助状态并恢复输入框焦点。
- 新增 `practiceSettings.js`；旧 `assistMethod` 会迁移到 `borrowOnesMethod`。
- “看看计算方法”入口已在 Phase 4 接入完整动画。
- 已覆盖设置迁移、提示展开/收起、开关关闭、普通题隐藏和切题重置测试。

#### ✅ Phase 3：数位演示基础组件（已完成）

- 实现 `PlaceValueBoard` 十位/个位表格。
- 实现 `TenBundle`（一个十）和 `OneUnit`（一个一）基础视觉单元。
- 支持一个十与十个一之间的静态转换状态。
- 统一进位上箭头、退位下箭头和数位提示条。
- 支持数位对齐、当前步骤高亮及进退位前后状态展示。
- 添加基础组件渲染测试，并预留 `prefers-reduced-motion` 适配接口。
- 支持通过 `tensCount`、`onesCount`、划去数量、当前高亮列和 `exchange` 组合静态动画帧。
- 组件提供数位摘要、划去状态和转换提示的可访问语义。

#### ✅ Phase 4：进位、退位动画与第二层交互（已完成）

- **进位动画**：消费 `align → addOnes → carry → addTens → combine`。
- **退位动画**：消费 `regroup → subtractOnes → subtractTens → combine`。
- 动画文案和表达式必须与教材规范示例保持一致。
- 启用“看看计算方法”，支持第一层切换到第二层。
- 支持跳过动画、完成后回到原题并重新聚焦答案输入框。
- 切题时销毁动画状态，尊重系统的减少动态效果设置。
- 额外覆盖 `9+1`、`18+2`、`36+27`、`15-8`、`10-3`、`100-18`。
- 加法在计算前保留两个加数的上下数位：个位补成 10、捆成 1 个十、移动进位及十位融合均展示来源和过程。
- 减法先保留被减数和减数的上下数位：一个十拆成 10 个一、个位划去、十位划去及剩余合并均分阶段展示。
- 退位换来的 10 个一固定单排显示；个位、十位均先展示划去过程，再收拢为本数位结果。
- 某一数位完成后，下排改为“已减”状态；计算下一数位时持续保留上一数位结果，不重新显示减数。
- 设置页可选择破十法或平十法；仅替换退位减法的 `subtractOnes` 内部动画，加法完全不受影响。
- `10-3` 的十位步骤明确显示“无需再减”，`100-18` 继续按“10 个十”演示。
- 使用共用播放器统一上一步/下一步、5/10/20 秒三档自动推进、步骤进度、跳过、重播和完成返回行为。

#### ✅ Phase 5：使用记录与结算摘要（已完成）

##### ✅ Phase 5.1：会话内辅助采集（已完成）

- 为每道题初始化辅助状态：资格、类型、最高层级、完整演示方法和退位个位策略。
- 点击“需要提示”将最高层级提升到 `level: 1`；点击“看看计算方法”提升到 `level: 2`。
- 同一道题多次展开只保留最高层级；收起、上一步、重播和跳过均不降低已经记录的层级。
- `level: 2` 进位记录 `placeValueCarry`；退位记录 `placeValueBorrow` 以及实际使用的 `breakTen | bridgeTen`。
- 切题和完成训练时固化当前题状态；未使用但符合资格的题明确记录 `eligible: true, level: 0`。

##### ✅ Phase 5.2：存储结构升级与兼容（已完成）

- 新记录写入 `schemaVersion: 2`，使用 `items[]` 聚合 `question / userAnswer / result / assistUsage`。
- `storage.js` 在一个位置完成记录构建和结构规范化，页面不直接拼接持久化对象。
- 读取旧的并列数组记录时转换为 `items[]`，但每题设置 `assistUsage: null`。
- 旧记录不得误判为独立完成；保存新记录时校验 `used === (level > 0)`。
- Result、Correction、Stats 统一通过兼容读取层消费记录，避免各页面分别判断版本。

##### ✅ Phase 5.3：结算摘要（已完成）

- 结算页增加独立完成、只看提醒、查看方法三个题数，仅统计 `eligible: true` 且有记录的题目。
- 普通题和 `assistUsage: null` 的旧题不进入辅助摘要分母。
- 不改变现有分数、错误分类、星级和综合评价公式，使用辅助不直接扣分。
- 订正页暂不采集新的辅助使用记录。

##### ✅ Phase 5.4：测试与验收（已完成）

- 覆盖同题多次展开取最高层级、切题固化、最后一题保存及辅助关闭流程。
- 覆盖进位第二层、退位破十法第二层、退位平十法第二层的方法和策略记录。
- 覆盖 schema v1 旧记录转换、schema v2 往返保存以及缺失/损坏辅助字段的容错。
- 覆盖 Session → Storage → Result 的完整数据闭环和摘要口径。

#### ✅ Phase 6：自动化集成验证（已完成）

- 补充 `assistEnabled=false` 且页面刷新丢失路由状态时，从本地设置恢复训练的覆盖。
- 补充练习页和订正页通过 Enter 键提交答案的键盘操作覆盖。
- 补充移动端拦截边界测试：`767px` 显示终端提示，`768px` 及以上恢复应用内容，并覆盖运行时窗口变化。
- 补充“减少动态效果”测试，验证数位演示保持稳定步骤状态，不依赖位移动画表达结果。
- 全量自动化测试与生产构建通过；真实浏览器中的端到端体验验收拆分到 Phase 7。

#### ✅ Phase 7：真实浏览器验收与体验收尾（已完成）

- 在 Playwright CLI 真实浏览器中逐项验证了设置、练习、刷新恢复、结算、历史记录和错题订正闭环，12 个场景全部通过。
- 关闭辅助后做题界面不受影响，浏览器控制台无新增 error 或 warning。
- 767px 移动端拦截、768px 恢复、1024px 和 1440px 布局均正常，无横向溢出。
- 快 5 秒/中 10 秒/慢 20 秒三档自动播放、上一步/下一步、跳过和重播操作均可正常使用。
- 完成验收后无 P1/P2 缺陷，所有自动化测试与生产构建通过。

#### ✅ Phase 8：真实浏览器验收与体验收尾升级版（已完成）

Phase 8 在 Phase 7 验收条件基础上，将人工浏览器操作替换为 Playwright 自动化 E2E 测试，覆盖设置页交互、关闭辅助做题、刷新恢复、两层辅助（进位/退位/破十法/平十法）、播放控制、结算订正闭环、响应式矩阵、可访问性和控制台检查。

**配置与运行：**

```bash
npm start                              # 先启动 Vite 开发服务
npm run test:e2e                       # 无头模式运行全部 E2E 测试
npm run test:e2e:headed                # 有头模式（便于调试）
npm run test:e2e:report                # 查看 HTML 报告
```

配置文件：`tests/e2e/playwright.config.js`，`vite.config.js` 已通过 `exclude: ['tests/e2e/**']` 隔离 Playwright 测试。

**测试文件清单（实际落地，按拆分后的 8 spec 规划）：**

| 文件 | 覆盖场景 | 对应 Phase 7 章节 |
|---|---|---|
| `tests/e2e/minimal.spec.js` | 首页打开 → 进入设置页（最小可用验证） | — |
| `tests/e2e/settings.spec.js` | 设置页控件交互、题数单选、辅助开关、破十法/平十法切换、刷新持久化 | 4.1 |
| `tests/e2e/practice-basic.spec.js` | 关闭辅助做题、Enter 提交、切题焦点、刷新恢复 | 4.2, 4.3 |
| `tests/e2e/assist-hint.spec.js` | 第一层提醒展开/收起、普通题无入口 | 4.4 |
| `tests/e2e/assist-carry.spec.js` | 进位加法完整演示、边界题（18+2）、三档速度、上一步/下一步/跳过/重播 | 4.5, 4.8 carry 部分, 4.9 |
| `tests/e2e/assist-borrow.spec.js` | 退位减法破十法/平十法、边界题（10-3）、三档速度、播放控制 | 4.6, 4.7, 4.8 borrow 部分, 4.9 |
| `tests/e2e/full-flow.spec.js` | 完整结算、历史记录查看、错题订正闭环 | 4.10 |
| `tests/e2e/responsive.spec.js` | 响应式矩阵（767/768/1024/1440） | 5 |
| `tests/e2e/a11y-console.spec.js` | 减少动态效果、键盘 Tab/Enter、控制台 error/warning 检查 | 6, 7 |

> 当前进度：全部 8 个 spec 已落地（60 用例通过）。Phase 8 E2E 完成。

**完成标准：**

- 所有 spec 在无头 chromium 中全部通过（workers: 1 串行）。
- 每个 spec 结束时控制台无未捕获 error，新增 warning 已说明原因。
- 全量 Vitest 测试和生产构建在 E2E 执行前后均保持通过。
- 响应式矩阵覆盖从宽屏 → 767px → 768px → 1024px → 1440px 且不刷新恢复。
- 验证完成后的截图和 trace 保留在 `tests/e2e/test-results/`，HTML 报告在 `tests/e2e/e2e-report/`。

### v2.4 验收标准

- 不进位、不退位的题目不出现辅助入口；所有真实进位、退位题均可使用辅助。
- 符合条件的题目只在开启辅助后显示低干扰的“需要提示”按钮。
- 用户未点击时，不显示任何提示或动画。
- 第一层只展示进位或退位关键提醒，不直接给出答案。
- 第二层严格按教材顺序展示个位、十位计算和数位变化。
- 每道进位题明确展示“10 个一换成 1 个十，向十位进 1”。
- 每道退位题明确展示“从十位退 1，1 个十换成 10 个一”。
- `27+5` 必须得到 `7+5=12 → 个位写2进1 → 2+1=3 → 32`。
- `43-18` 必须得到 `43=30+13 → 13-8=5 → 30-10=20 → 20+5=25`。
- 动画结束后仍由孩子自己填写并提交答案。
- 切换题目后辅助状态完全重置。
- 使用辅助不改变题目、计时、批改、错误分析和综合评价结果。
- 新记录使用 `schemaVersion: 2` 和按题聚合的 `items[]` 保存辅助使用情况。
- 符合辅助资格但未使用的题记录 `eligible: true, level: 0`；普通题不进入辅助摘要。
- 旧记录转换后使用 `assistUsage: null`，仍能正常展示且不误算为独立完成。
- `level: 1` 不记录完整演示方法；`level: 2` 正确记录进退位方法及破十法/平十法策略。
- 拆分算法、边界条件和主要交互均有自动化测试。

---

## 关联文档

- [README.md](./README.md)：当前生效的功能规格
- [docs/phase7-真实浏览器验收与体验收尾.md](./docs/phase7-真实浏览器验收与体验收尾.md)：Phase 7 手工验收清单
- [docs/phase8-e2e-implementation-plan.md](./docs/phase8-e2e-implementation-plan.md)：Phase 8 E2E 实施计划详版
- [docs/github-pages-deploy-troubleshooting.md](./docs/github-pages-deploy-troubleshooting.md)：GitHub Pages 部署排障
- [docs/local-dev-url-trailing-slash.md](./docs/local-dev-url-trailing-slash.md)：Vite 本地开发 URL 尾斜杠说明
- [docs/nginx-deploy.md](./docs/nginx-deploy.md)：Nginx 部署参考
- [docs/playwright-cli-usage.md](./docs/playwright-cli-usage.md)：Playwright CLI 使用说明
- [docs/fisher-yates-shuffle.md](./docs/fisher-yates-shuffle.md)：Fisher–Yates 洗牌算法笔记