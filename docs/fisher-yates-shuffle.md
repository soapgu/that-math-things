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

## 时间复杂度

- 时间复杂度：O(n)
- 空间复杂度：O(n)（因为复制了一份数组；如果允许原地修改可为 O(1)）

## 参考链接

### 英文
- [Fisher–Yates shuffle - Wikipedia](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [The Danger of Naïveté - Coding Horror](https://blog.codinghorror.com/the-danger-of-naivete/)
- [How to shuffle correctly - Mike Bostock](https://bost.ocks.org/mike/shuffle/)
- [Array.prototype.sort() 做随机排序的问题](https://www.robweir.com/blog/2010/02/microsoft-random-browser-ballot.html) — 解释了为什么 `arr.sort(() => Math.random() - 0.5)` 也不是等概率

### 中文
- [洗牌算法详解 - 掘金](https://juejin.cn/post/7611525240981176354) — 含 Fisher-Yates 正确性证明、Sattolo 算法、蓄水池抽样
- [Fisher–Yates shuffle 洗牌算法 - HyG](https://gaohaoyang.github.io/2016/10/16/shuffle-algorithm) — 含迭代步骤表与动画演示
- [洗牌算法 - 小傅哥 bugstack 虫洞栈](https://bugstack.cn/md/algorithm/logic/sets/2023-02-10-fisher-yates.html) — 业务场景驱动（考试题目乱序、答案选项乱序）
