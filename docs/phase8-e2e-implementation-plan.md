# Phase 8 E2E 自动化实施计划

> 把 Phase 7「真实浏览器验收与体验收尾」的人工浏览器操作替换为 Playwright 自动化 E2E 测试。本计划是 Phase 8 的实施依据，落地后与 `phase7-真实浏览器验收与体验收尾.md` 互为对照。

## 1. 范围与产出

覆盖 `phase7-真实浏览器验收与体验收尾.md` 第 4 节 10 个验收场景、第 5–7 节尺寸/可访问性/控制台三类横向检查。最终输出：

- **8 个 spec 文件**
- **3 个新增 Page Object**：`MathAssistPage`、`AssistPlayerPage`、`MobileBlockerPage`
- **3 个 helper**：`ConsoleCollector`、`QuestionFinder`、`viewport`
- **6 个现有 Page Object 的修订**

所有题目走真实出题 + 重试循环，不直接篡改题目数据。

## 2. 文件清单（最终）

```text
tests/e2e/
├── playwright.config.js              # 修订：补 retries=0、timeout 120s，assist-*.spec 单文件 180s
├── helpers/
│   ├── ConsoleCollector.js           # 新增：订阅 page.on('console')/('pageerror')，按节点快照断言
│   ├── QuestionFinder.js             # 新增：解析题目文本 → {a, op, b}，判定 carry/borrow/普通/边界
│   └── viewport.js                   # 新增：767/768/1024/1440 切换 + 不刷新恢复断言
├── pages/
│   ├── HomePage.js                   # 修订
│   ├── SettingsPage.js               # 修订：补 setRange/setAddRatio/reload
│   ├── SessionPage.js                # 修订：纠正按钮文案、补 getCurrentQuestion/expectAssistEntry
│   ├── MathAssistPage.js             # 新增：第一层折叠/展开/收起、第二层进入
│   ├── AssistPlayerPage.js           # 新增：速度档、上一步/下一步/跳过/重新播放/回到题目
│   ├── ResultPage.js                 # 修订：补 getAssistSummary 拆解、综合评价读取
│   ├── StatsPage.js                  # 修订：补 recordCount、clickRecordByIndex
│   ├── CorrectionPage.js             # 修订：补 wrongCount、isCompleteText
│   └── MobileBlockerPage.js          # 新增：isBlocked、blockerText
├── minimal.spec.js                   # 已存在，保留
├── settings.spec.js                  # 4.1
├── practice-basic.spec.js            # 4.2, 4.3
├── assist-hint.spec.js               # 4.4
├── assist-carry.spec.js              # 4.5 + 4.8 carry 部分
├── assist-borrow.spec.js             # 4.6, 4.7, 4.8 borrow 部分, 4.9
├── full-flow.spec.js                 # 4.10
├── responsive.spec.js                # 第 5 节
└── a11y-console.spec.js              # 第 6, 7 节
```

## 3. 每个 spec 的覆盖要点

### settings.spec.js（4.1）

- 从首页 → 设置页，依次选择 10/20/50 题，断言 radio 选中态唯一
- 关闭辅助 → 断言破十/平十 radio `disabled` 但 value 保持
- 重新开启 → 切换破十法/平十法各一次，断言文案完整可读
- 调范围 20/50/100、加法比例 0/50/100、进退位难度 1/2/3 星
- `page.reload()` → 断言所有设置值恢复
- 控制台无 error

### practice-basic.spec.js（4.2, 4.3）

1. 关闭辅助、10 题、范围 50 → 开始训练
2. 完成≥3 题：一题点「下一题」、一题按 Enter、一题观察计时器
3. 断言：无辅助入口、空输入按钮 disabled、切题后输入框清空且 focused、计时器文本单调递增
4. **4.3 刷新恢复**：另一轮，20 以内、10 题、关辅助；进入第 1 题后 `page.reload()`；断言路由仍在 `/practice/session`、无白屏、无辅助入口；返回设置页断言值恢复

### assist-hint.spec.js（4.4）

- 开辅助、进退位难度 3 星、范围 50、10 题
- 用 `QuestionFinder` 循环答题，直到遇到 carry/borrow 题（不点演示）；记录题面
- 断言「需要提示」可见 → 点击 → 验证 `hint.message` 与 `hint.question` 文本出现、答案不在 DOM
- 「我再想想」收起 → 再次「需要提示」展开稳定
- 简单题（无 carry/borrow）断言「需要提示」不可见

### assist-carry.spec.js（4.5 + 4.8 carry）

- 开辅助、加法比例 100、进退位 3 星、范围 50、10 题
- 循环直到遇到进位题（首选 `27+5` 类或近似；遇 `18+2` 边界单独成 case）
- 进入方法演示：断言步骤序列 `align → addOnes → carry → addTens → combine`
- 第一步断言两加数上下分行、十位/个位分离（aria-label 读数位表）
- 逐步「下一步」：个位合并为 10 个一+余数 → 10 个一换成 1 个十移到十位 → 十位融合 → 合并
- 「上一步」回退 → 「下一步」前进 → 「重新播放」回第一步 → 三档速度各观察一次
- 边界 case：`18+2` 必须保留辅助资格、剩余个位为 0 时数位表正常
- 完成后「回到题目」→ 输入框 focused、动画未自动填答案

### assist-borrow.spec.js（4.6 / 4.7 / 4.8 borrow / 4.9）

- **第一轮破十法**：设置 `borrowOnesMethod=breakTen`、加法比例 0、进退位 3 星、范围 100、10 题
- 循环直到退位题（首选 `43-18` 类、再尝试 `10-3`/整十边界）
- 进入方法演示：步骤序列 `regroup → subtractOnes(破十) → subtractTens → combine`
- 断言 1 个十拆为 10 个一单排显示；个位先 `10-减数个位` 再加回原个位
- 进入十位后个位结果保留；前后切换状态不丢失
- **第二轮平十法**：返回设置页切 `bridgeTen`，新开一轮
- 退位题步骤 `regroup → subtractOnes(平十: 减到整十 → 再减剩余) → subtractTens → combine`
- 验证 `12-4` 表达式出现 `12-2=10` 与 `10-2=8`
- **4.9 三档速度与控制**：在某一轮的演示里依次选 快 5秒/中 10秒/慢 20秒，断言 `Segmented` value 唯一、自动推进计时器约等于该档（允差 ±2s）；中途「上一步」打断后计时器重置不连跳两步
- 第一步「上一步」disabled、最后一步「下一步」替换为「回到题目」

### full-flow.spec.js（4.10）

- 开辅助、10 题、混加法比例 50、进退位 3 星
- **必须满足**：≥1 题不用辅助、≥1 题只看第一层、≥1 题看第二层、≥1 题故意答错
- 最后一题分别用 Enter 与「完成」按钮两种方式各跑一轮
- 结算页断言：得分=正确数/总数×100、用时非空、辅助摘要 3 个数字与本轮操作一致（独立/提醒/方法）、普通题不计入分母
- 进入统计数据 → 历史记录数 +1 → 点击最新记录 → 进入详情（`location.state.record`）
- 从详情「订正」→ 订正页只含本轮错题 → 用正确答案全部 Enter 提交 → 出现「🎉 全部订正完成！」
- 返回结果页/统计页断言原记录未被篡改（辅助摘要字段不变）

### responsive.spec.js（第 5 节）

- `page.setViewportSize` 切 1440/1024/768/767 顺序执行
- 767px：`MobileBlockerPage.isBlocked()`、文本「目前网站只支持电脑和 Pad 访问」、训练内容 input disabled
- 767 → 768：**不刷新**，断言拦截层消失、应用内容恢复
- 768：在 Session 展开最长退位演示卡片，截图断言无水平溢出（`document.documentElement.scrollWidth <= viewportSize.width`）
- 1024 / 1440：设置页 + 演示卡片截图
- 1440 → 767 → 1024 不刷新：断言当前题号和输入值不重置

### a11y-console.spec.js（第 6, 7 节）

- **6.1 减少动态效果**：`browser.newContext({ reducedMotion: 'reduce' })` 跑一次 carry 与一次 borrow 演示，断言步骤直接呈现稳定终态、按钮可操作
- **6.2 键盘**：Tab 在 设置/开始训练/答案输入/「需要提示」/「看看计算方法」/「上一步」/「下一步」/「跳过演示」之间移动，断言焦点顺序、`Space`/`Enter` 激活、一次按键一次动作
- **7. 控制台**：用 `ConsoleCollector` 在 5 个节点采集 — 首页加载后 / 展开完整演示后 / 刷新练习页后 / 进入结算后 / 完成订正后；断言无 error、无新增 React key/state/卸载后更新/a11y warning；Vite 自身 info 日志记白名单

## 4. Page Object 调整要点

| PO | 关键修订 |
|---|---|
| `SessionPage` | `clickReplay` → 「重新播放」；`clickFinishDemo` → 「回到题目」；新增 `getCurrentQuestion()` 返回 `{a, op, b}`、`expectAssistEntryVisible/invisible()`、`getProgress()`、`getTimerText()` 支持 reduced-motion |
| `SettingsPage` | 新增 `setRange(v)`、`setAddRatio(v)`、`expectBorrowMethodDisabled()`、`reload()`；保留 `selectBorrowOnesMethod` |
| `MathAssistPage`（新） | `expand()`、`collapse()`、`showMethod()`、`expectHintMessage(text)`、`expectNoEntry()` |
| `AssistPlayerPage`（新） | `setSpeed('fast'/'medium'/'slow')`、`expectStepSequence(types[])`、`expectExpression(text)`、`prevStep()/nextStep()/skip()/replay()/returnToQuestion()`、`isFirstStepPrevDisabled()`、`getProgressPercent()` |
| `ResultPage` | `getScore()`、`getCorrectWrong()`、`getTimeSpent()`、`getAssistCounts()` → `{independent, hintOnly, method}`、`expectErrorDetail(questionText)` |
| `StatsPage` | `getRecordCount()`、`clickLatestRecord()`、`clickRecordByIndex(i)` |
| `CorrectionPage` | `getWrongCount()`、`answerAndEnter(v)`、`expectComplete()` |
| `MobileBlockerPage`（新） | `isBlocked()`、`getVisibleText()` |

## 5. 关键 UI 文案（实现期必须对齐）

实测源码得到的稳定文案，避免硬编码旧记忆导致定位失败：

| 元素 | 文案/选择器 |
|---|---|
| 入口按钮 | 「需要提示」 |
| 第一层收起 | 「我再想想」 |
| 第二层入口 | 「看看计算方法」 |
| 播放控制 | 「跳过演示」「上一步」「下一步」「重新播放」「回到题目」 |
| 速度档 Segmented | 「快 5秒」「中 10秒」「慢 20秒」（value: `fast`/`medium`/`slow`） |
| 演示 section aria-label | 「进位计算演示」「退位计算演示」 |
| 最后一题按钮 | 「完成」（之前题为「下一题」） |
| 设置页开关 | 「辅助运算」 |
| 退位个位算法 | 「破十法」「平十法」 |
| MobileBlocker 文案 | 「目前网站只支持电脑和 Pad 访问」 |
| 全部订正完成 | 「🎉 全部订正完成！」 |
| 结算页按钮 | 「再来一次」「订正」「统计数据」 |
| 设置页 radio | 「10 题」「20 题」「50 题」 |

## 6. 题目随机性策略（真实出题 + 重试循环）

`QuestionFinder` helper 提供两个能力：

1. `parse(page)`：从 Session 题面文本正则提取 `{a, op, b}`
2. `classify(q, settings)`：用 `assistGenerator` 同款 `eligible/kind` 规则判 carry/borrow/简单/边界

循环逻辑封装为 `untilQuestion(predicate, { maxTries = 50, answerCorrect = true })`：

- 每轮答题前进、若非目标题则按正确答案继续
- 命中目标题立即停止返回
- **路由感知早退**：每轮顶部检测 `page.url()` 是否仍含 `/practice/session`；解析 `null` 或路由已切都抛 `err.code === 'SESSION_ENDED'`，杜绝在结算页伪匹配题面
- 超过 `maxTries` 抛 plain Error（视为 phase7 中「无法稳定复现」的缺陷记录，而非篡改数据）

> 题面 span 上加了 `data-testid="question-prompt"`，`SessionPage.getQuestionText()` 只在该 locator 上取文本，避免与结算页逐题详情里相同格式的 `a op b =` 串扰。源码改动局限于 `src/pages/Practice/Session/index.jsx` 一处 attribute，不影响 a11y 与现有 Vitest 用 `getByText('27 + 5 =')` 的断言。

边界题 `18+2`、`10-3`、整十被减数在 10 题规模下单场期望 ≤0.4 道，因此 spec 自定 `MAX_SESSIONS` 跨轮循环：捕获 `err.code === 'SESSION_ENDED'` 即返回设置页重开新训练，最多 5 轮。helper 不内建跨轮，保持单一职责。严格遵守 Phase 7 第 3 节约定，不通过读取/直接修改 `localStorage` 伪造题目。

## 7. 实施顺序与回归

按依赖序：

1. helpers + PO 修订/新增（先让基础设施可用）
2. `minimal.spec.js` 跑通作为冒烟基线
3. `settings.spec.js` → `practice-basic.spec.js` → `assist-hint.spec.js`
4. `assist-carry.spec.js` → `assist-borrow.spec.js`
5. `full-flow.spec.js`
6. `responsive.spec.js` → `a11y-console.spec.js`

每个 spec 完成后立即跑：`npm run test:e2e -- tests/e2e/<spec>`；全绿后跑 `npm test` + `npm run build` 互补回归（对齐 Phase 7 第 9 节修复回归顺序）。

## 8. 完成标准（对齐 Phase 7 第 10 节）

- 8 个 spec 在 `npm run test:e2e` 全绿（workers: 1 串行）
- 单 spec 控制台无未捕获 error，新增 warning 已在 `a11y-console.spec.js` 文档化或修复
- 破十/平十法各实测一题退位演示，进位演示与三档速度/控制均通过
- 刷新恢复、关辅助、Enter、结算、历史、订正闭环全部通过
- Vitest 全量 + 生产构建通过
- 所有 P1、P2 缺陷已关闭；P3 若延期必须说明原因和后续版本
- README 同步 Phase 8 最终结论，并列出实际完成的验收范围

## 9. 已知风险与对策

| 风险 | 对策 |
|---|---|
| 随机出题遇不到 `18+2`/`10-3` 边界 | `maxTries=100` + 多轮重开；若彻底无法命中则记为已知未覆盖项并降级该 case 为 P3 |
| framer-motion 12 在 reduced-motion 下行为差异 | 用 `newContext({ reducedMotion: 'reduce' })` 而非 CSS hack；只断言稳定终态不断言动画中间帧 |
| Result 详情从 Stats 跳转依赖 `history.state` | Playwright 同一 page 内走 SPA 路由，状态由 React Router `location.state` 携带，不需要特殊处理 |
| 控制台 warning 来源混杂 | `ConsoleCollector` 提供 Vite dev 白名单 + 仅匹配 `Warning:` 前缀的 React 警告 |
| 真实出题速度慢导致总时长超 10 分钟 | 全局 timeout 120s，`assist-*.spec` 单文件 180s，整体 workers=1 串行但可顺序复用同一 browser context |
| Playwright 与 Vite dev server 同步 | E2E 测试启动前由 `webServer` 配置（或手动 `npm start`）拉起 vite，`baseURL` 指向 `http://127.0.0.1:5173/that-math-things/` |

## 10. 最终验收记录模板

落地后填写，与 Phase 7 模板一致：

```markdown
## Phase 8 验收结果

- 执行日期：YYYY-MM-DD
- 分支与提交：branch / commit
- 浏览器：chromium (Playwright)
- E2E 测试：通过数 / 总数
- Vitest：通过数 / 总数
- 生产构建：通过 / 失败
- 实际题目清单：进位题 a+b、退位题 a-b、破十演示题 a-b、平十演示题 a-b
- 尺寸矩阵：767 / 768 / 1024 / 1440
- 控制台：error 数，warning 数
- 修复缺陷：P1 数，P2 数，P3 数
- 延期事项：无 / 列表
- 最终结论：通过 / 有条件通过 / 不通过
```