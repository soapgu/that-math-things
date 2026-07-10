# Fisher-Yates 洗牌算法

> 本项目 `src/utils/random.js` 中的 `shuffleArray` 函数使用该算法实现数组随机打乱。

## 代码

```javascript
export function shuffleArray(arr) {
  const shuffled = [...arr];              // 复制一份，不修改原数组
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));  // 在 [0, i] 范围随机选一个位置
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];  // 交换
  }
  return shuffled;
}
```

## 算法思想

> 从末尾开始，每次从未处理区域随机选一个元素，和当前末尾交换，已处理区域逐步扩大。

```
初始:    A    B    C    D
         ↑              ↑
      未处理          i=3

i=3:  随机 j=1 → 交换 B↔D
       A    D    C    B
                     ↑已处理

i=2:  随机 j=0 → 交换 A↔C
       C    D    A    B
                ↑已处理

i=1:  随机 j=0 → 交换 C↔D
       D    C    A    B
            ↑已处理

结果:  D C A B（等概率的随机排列）
```

## 为什么是等概率

Fisher-Yates 每次从剩余未处理元素中**等概率**抽取一个放到当前位置。

以 4 个元素为例：

| 步骤 | 操作 | 单步概率 |
|---|---|---|
| i=3 | 从 4 个中选 1 个放末尾 | 1/4 |
| i=2 | 从剩余 3 个中选 1 个放倒数第二 | 1/3 |
| i=1 | 从剩余 2 个中选 1 个放倒数第三 | 1/2 |
| i=0 | 只剩 1 个，放首位 | 1 |

**任意一种排列**出现的概率为：

```
1/4 × 1/3 × 1/2 × 1 = 1/24 = 1/4!
```

所有 24 种排列概率相等。推广到 n 个元素，任意排列概率均为 `1/n!`。

## 为什么从前往后会导致概率不均

### 错误写法

```javascript
// 错误的"从前往后"洗牌
for (let i = 0; i < n; i++) {
  const j = Math.floor(Math.random() * n); // [0, n)
  [arr[i], arr[j]] = [arr[j], arr[i]];
}
```

### 路径总数计算

每个位置 i 都从**整个数组的 n 个位置**中随机选 j 交换，一共遍历 n 次，每次有 n 种选择。

**路径总数 = n^n**

以 n=3 为例：遍历 3 次，每次 3 种选择，路径总数 = 3^3 = 27。

全排列总数 = 3! = 6。

```
27 ÷ 6 = 4.5  不是整数
```

### 模拟验证

用 n=3 暴力枚举所有 27 条路径，统计每种排列出现次数：

```
排列    出现次数
ABC     4 次 ← 偏多
ACB     5 次 ← 偏多
BAC     5 次 ← 偏多
BCA     5 次 ← 偏多
CAB     4 次 ← 偏少
CBA     4 次 ← 偏少
```

概率分布不均——有的排列出现的概率是 5/27，有的是 4/27。

### 扩展到 n

| n | 路径总数 n^n | 全排列 n! | 能否整除 | 是否等概率 |
|---|---|---|---|---|
| 2 | 4 | 2 | ✅ 整除 | ✅ 等概率 |
| 3 | 27 | 6 | ❌ | ❌ |
| 4 | 256 | 24 | ❌ | ❌ |
| 5 | 3125 | 120 | ❌ | ❌ |

### 本质区别

| | 从后往前（Fisher-Yates） | 从前往后 |
|---|---|---|
| 每次选择范围 | 逐步缩小（剩余未处理） | 固定为整个数组 |
| 路径总数 | n! | n^n |
| 能否整除 n! | 正好相等 | 不能（n>2 时） |
| 结果 | 完全等概率 | 概率不均 |

## 反面案例：Microsoft Browser Ballot

### 背景

2010 年微软为履行欧盟反垄断和解，在 Windows 7 中提供浏览器选择屏（BrowserChoice.eu），要求 5 个浏览器以随机顺序展示。斯洛伐克技术网站 DSL.sk 测试后发现排序并非随机——IE 出现在第 5 位的概率高达 50%，而 Chrome 更多出现在前 3 位。

### 错误代码

```javascript
function RandomSort(a, b) {
  return (0.5 - Math.random());   // 返回 -0.5 ~ 0.5 之间的随机数
}
```

`Array.sort()` 调用此函数进行两两比较，根据返回值决定元素的先后顺序。

### 误解澄清

问题**不在** `Math.random()`——它的分布本身是均匀的（0~1 之间每个数字等概率出现）。根因是：**拿随机数当排序依据，破坏了排序算法本身的正确性。**

### 比较函数必须自洽

排序引擎依靠比较结果剪枝，不会比较所有可能的配对——它利用已确定的顺序推断未比较的元素关系，从而减少比较次数。

正常的比较函数：

```
compare(a, b) = -1  → a 排在 b 前面
compare(b, c) = -1  → b 排在 c 前面
→ 排序算法可以推断 a 排在 c 前面，不需要再比较 a 和 c
```

但 `RandomSort` 违反了排序必需的三个条件：

| 性质 | 含义 | RandomSort |
|---|---|---|
| **确定性** | `compare(a, b)` 永远返回相同结果 | ❌ 每次调用返回值不同 |
| **传递性** | 若 a<b 且 b<c 则 a<c | ❌ 随机返回值无法传递 |
| **对称性** | 若 a<b 则 b>a | ❌ a<b 下一次可能 b<a |

### 3 元素示例：为什么分布不均

以 `[IE, Chrome, Firefox]` 用快速排序为例：

```
第一轮：选 pivot = Chrome
  比较 IE vs Chrome：RandomSort 说 IE 小 → IE 放左边
  比较 Firefox vs Chrome：RandomSort 说 Firefox 小 → Firefox 放左边
  结果：[IE, Firefox, Chrome]

重新执行同一组（元素顺序相同，但随机返回值不同）：
  比较 IE vs Chrome：这次 RandomSort 说 IE 大 → IE 放右边
  比较 Firefox vs Chrome：RandomSort 说 Firefox 小 → Firefox 放左边
  结果：[Firefox, Chrome, IE]
```

不同的排序算法、不同的遍历路径、不同的随机返回值，三者耦合，产生的分布既非均匀也不可预测。这正是同一段代码在 IE 和 Firefox 上跑出截然不同分布的原因。

### 统计验证

Rob Weir 用皮尔逊卡方检验做了 10,000 次测试：

| 算法 | p 值 | 结论 |
|---|---|---|
| `sort + RandomSort` | **< 2.2e-16**（趋近于 0） | 高度显著非随机 |
| Fisher-Yates | **0.1493**（> 0.05） | 无法拒绝随机假设 ✅ |

p 值小于 0.01 意味着"结果是均匀分布"的概率不到 1%。微软算法的 p 值接近 0，说明几乎可以确定它不是均匀分布；而 Fisher-Yates 的 p 值为 0.1493，远高于 0.05 的显著性阈值，无法拒绝"分布是均匀的"这一假设。

### 教训

- 这不是阴谋，是经典的初级程序员错误（Hanlon 剃刀：能用愚蠢解释的，不要归咎于恶意）
- 从 Fisher 和 Yates 1938 年提出该算法，到 Knuth 在《计算机程序设计艺术》中推广，再到 2010 年微软这个案例——正确做法一直都写在教科书里
- 随机不等于随意。用 `Math.random` 参与排序不等于得到随机均匀的顺序
- 如果当初微软直接使用 Fisher-Yates 算法（或任何一篇 Wikipedia 上的实现），就不会有这个影响欧盟反垄断案的技术丑闻

## 时间复杂度

- 时间复杂度：O(n)
- 空间复杂度：O(n)（因为复制了一份数组；如果允许原地修改可为 O(1)）

## 参考链接

### 英文
- [Fisher–Yates shuffle - Wikipedia](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [The Danger of Naïveté - Coding Horror](https://blog.codinghorror.com/the-danger-of-naivete/)
- [How to shuffle correctly - Mike Bostock](https://bost.ocks.org/mike/shuffle/)

### 中文
- [洗牌算法详解 - 掘金](https://juejin.cn/post/7611525240981176354) — 含 Fisher-Yates 正确性证明、Sattolo 算法、蓄水池抽样
- [Fisher–Yates shuffle 洗牌算法 - HyG](https://gaohaoyang.github.io/2016/10/16/shuffle-algorithm) — 含迭代步骤表与动画演示
- [洗牌算法 - 小傅哥 bugstack 虫洞栈](https://bugstack.cn/md/algorithm/logic/sets/2023-02-10-fisher-yates.html) — 业务场景驱动（考试题目乱序、答案选项乱序）
- [Microsoft's Browser Ballot 洗牌问题](https://www.robweir.com/blog/2010/02/microsoft-random-browser-ballot.html) — `arr.sort(() => Math.random() - 0.5)` 导致的概率不均
