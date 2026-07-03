# 本地开发 URL 尾斜杠问题

> HashRouter + CRA dev server 下，浏览器 URL 丢失尾斜杠导致 hash 导航不美观的问题分析与修复。

---

## 目录

- [现象](#现象)
- [原因分析](#原因分析)
  - [第一层：PUBLIC_URL 没有尾斜杠](#第一层public_url-没有尾斜杠)
  - [第二层：CRA 自动打开 URL 时吞掉尾斜杠](#第二层cra-自动打开-url-时吞掉尾斜杠)
- [修复方法](#修复方法)
  - [方案对比](#方案对比)
  - [最终方案：自定义启动脚本](#最终方案自定义启动脚本)
  - [逐行解读](#逐行解读)
- [效果验证](#效果验证)

---

## 现象

本地 `npm start` 后，浏览器打开的 URL 为：

```
http://localhost:3000/that-math-things     ← 没有尾斜杠！
```

在应用中点击导航菜单，URL 变成：

```
http://localhost:3000/that-math-things#/       ← 斜杠被 # 吞掉
http://localhost:3000/that-math-things#/problems
```

期望的 URL：

```
http://localhost:3000/that-math-things/#/       ← 有尾斜杠，格式工整
http://localhost:3000/that-math-things/#/problems
```

线上（GitHub Pages）表现正常：

```
https://soapgu.github.io/that-math-things/#/       ✓
https://soapgu.github.io/that-math-things/#/problems  ✓
```

---

## 原因分析

### 第一层：PUBLIC_URL 没有尾斜杠

`package.json` 中定义：

```json
"homepage": "https://soapgu.github.io/that-math-things"
```

CRA 从 `homepage` 中提取路径作为 `PUBLIC_URL`：

```
PUBLIC_URL = "/that-math-things"    ← 没有尾斜杠！
```

`HashRouter` 通过设置 `window.location.hash` 来实现路由。当用户导航到首页时，HashRouter 执行：

```javascript
window.location.hash = '#/';
```

这个操作将 `#/` **追加到当前 URL 的末尾**：

```
当前 URL:  http://localhost:3000/that-math-things        (无尾斜杠)
追加 hash: http://localhost:3000/that-math-things#/      (被 # 吞掉/)
期望 URL:  http://localhost:3000/that-math-things/#/     (有 / 分隔)
```

### 第二层：CRA 自动打开 URL 时吞掉尾斜杠

尝试在 `start` 脚本中设置 `PUBLIC_URL` 追加尾斜杠：

```json
"start": "PUBLIC_URL=/that-math-things/ react-scripts start"
```

但 CRA 的 `react-dev-utils/openBrowser.js` 在调用 `open` 命令时，URL 中的尾斜杠会被操作系统的 `open` 命令或浏览器自身去掉。结果是 CRA 自动打开的地址仍然是：

```
http://localhost:3000/that-math-things    ← 尾斜杠丢失
```

---

## 修复方法

### 方案对比

| 方案 | 做法 | 结果 |
|:---|:---|---|
| A. 改 `homepage` + `public/index.html` | `homepage` 加尾斜杠，改 `%PUBLIC_URL%` 拼接方式 | 影响生产构建资产路径，风险大 |
| B. `.env.development` 设置 `PUBLIC_URL` | 新建文件配置 | CRA 打开 URL 仍丢失尾斜杠 |
| C. **自定义启动脚本（最终方案）** | 用 shell 脚本控制启动和打开 | 稳定可控 |

### 最终方案：自定义启动脚本

**新建 `scripts/dev.sh`：**

```bash
#!/bin/bash
PUBLIC_URL=/that-math-things/ BROWSER=none react-scripts start &
PID=$!
sleep 3
open http://localhost:3000/that-math-things/
wait $PID
```

**修改 `package.json`：**

```json
"start": "bash scripts/dev.sh",
```

### 逐行解读

| 行 | 命令 | 作用 |
|:---|:---|---|
| 2 | `PUBLIC_URL=/that-math-things/ ... &` | 启动 dev server，设置公共路径**带尾斜杠**；`BROWSER=none` 阻止 CRA 自动打开；`&` 放入后台 |
| 3 | `PID=$!` | 保存 dev server 的进程 ID |
| 4 | `sleep 3` | 等待 dev server 完成启动 |
| 5 | `open http://.../that-math-things/` | 自己打开浏览器，URL **确保带尾斜杠** |
| 6 | `wait $PID` | 阻塞脚本，直到 dev server 被 Ctrl+C 终止，保持前台交互 |

**关键点：**
- `PUBLIC_URL` 的尾斜杠 `/that-math-things/` 确保 hash 追加后格式正确
- 绕过 CRA 的自动打开，由脚本显式 `open` 指定 URL
- `wait $PID` 让 Ctrl+C 能正常终止 dev server
- 不影响生产构建（生产构建走 `homepage` 字段，与脚本无关）

---

## 效果验证

`npm start` 执行后：

```
1. 终端输出 CRA 启动信息
2. 3 秒后浏览器自动打开：
   → http://localhost:3000/that-math-things/    ✓ 有尾斜杠
3. 应用内导航：
   → http://localhost:3000/that-math-things/#/       ✓
   → http://localhost:3000/that-math-things/#/problems  ✓
4. 多次点击菜单，URL 保持稳定正确
5. Ctrl+C 终止 dev server
```

线上不受影响，URL 维持：

```
https://soapgu.github.io/that-math-things/#/          ✓
https://soapgu.github.io/that-math-things/#/problems   ✓
```
