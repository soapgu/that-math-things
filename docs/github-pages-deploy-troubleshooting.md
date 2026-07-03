# GitHub Pages 部署故障排除记录

> 记录 `那年那数那些事` 项目从首次部署到完整可用的排障全过程。

---

## 目录

- [背景](#背景)
- [第一轮：BrowserRouter + homepage 部署](#第一轮browserrouter--homepage-部署)
  - [现象](#现象)
  - [定位](#定位)
  - [解决尝试：切换到 HashRouter](#解决尝试切换到-hashrouter)
- [第二轮：HashRouter 部署](#第二轮hashrouter-部署)
  - [现象](#现象-1)
  - [定位：CDN 缓存](#定位cdn-缓存)
  - [验证：查看 gh-pages 分支内容](#验证查看-gh-pages-分支内容)
  - [彻底修复](#彻底修复)
- [总结](#总结)

---

## 背景

项目使用 Create React App 构建，部署到 GitHub Pages 项目站点（`https://soapgu.github.io/that-math-things/`）。

关键配置：

```json
// package.json
{
  "homepage": "https://soapgu.github.io/that-math-things",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

路由使用 `react-router-dom v6`。

---

## 第一轮：BrowserRouter + homepage 部署

### 现象

- 访问 `https://soapgu.github.io/that-math-things/` → **页面空白**
- 控制台无报错，静态资源（JS/CSS）加载正常
- 本地 `npm start` 正常显示

### 定位

**根本原因**：`BrowserRouter` 不兼容 GitHub Pages 子路径部署。

GitHub Pages 项目站点将内容托管在子路径 `/that-math-things/` 下。当浏览器访问该路径时：
- `window.location.pathname` = `/that-math-things/`
- `BrowserRouter` 根据路径匹配路由，但其路由表只定义了 `/`、`/problems`、`/problems/:id`
- 没有任何路由匹配 `/that-math-things/` → 路由降级 → 无内容渲染

而本地开发时，CRA 的 dev server 运行在 `http://localhost:3000/`，路径 `pathname` 为 `/`，所以路由匹配正常。

**类比**：就像把一本内容全是 `/` 开头的书放在一个必须用 `/prefix/` 才能打开的盒子里—书签永远对不上。

### 解决尝试：切换到 HashRouter

尝试方案：

| 方案 | 原理 | 代价 |
|:---|:---|---|
| **A. HashRouter** | 路由存在 `#` 后面，不依赖服务器路径 | URL 有 `#`，但功能完整 |
| **B. BrowserRouter + basename** | 设置 `basename="/that-math-things"`，配合 404.html 重定向 | URL 干净，但需要额外维护 |

选择方案 A，修改 `src/index.js`：

```diff
- import { BrowserRouter } from 'react-router-dom';
+ import { HashRouter } from 'react-router-dom';

  // ...
- <BrowserRouter>
+ <HashRouter>
    <App />
- </BrowserRouter>
+ </HashRouter>
```

重建并部署：

```bash
npm run build && npm run deploy
```

---

## 第二轮：HashRouter 部署

用户反馈 HashRouter 部署后依然访问有问题，并发来截图：
- 菜单点击错题列表 → 跳转到 `https://soapgu.github.io/problems`（丢失子路径和 `#`）
- 点击首页 → 跳转到 `https://soapgu.github.io/`（同样丢失）

我额外修复了菜单导航问题（`domEvent.preventDefault`），但用户依然反馈：

> "首先 `https://soapgu.github.io/that-math-things/#/` 根本就没完整显示页面"

### 定位：CDN 缓存

这是一个最容易被忽略的问题。排查步骤：

**Step 1：检查本地最新构建**

```bash
# 查看 asset-manifest.json 中的 JS 文件 hash
cat build/asset-manifest.json
# → main.9af7d269.js  (HashRouter 版本)
```

**Step 2：检查 gh-pages 分支内容**

```bash
git fetch origin gh-pages
git ls-tree -r origin/gh-pages --name-only | head -10
# → static/js/main.9af7d269.js  ✓  (分支内容正确)
```

**Step 3：直接访问线上页面**

```bash
curl -s https://soapgu.github.io/that-math-things/index.html | grep -o 'main\.[^"]*\.js'
# → main.edb82f08.js  ❌  (旧版 BrowserRouter 版本)
```

关键发现：

| 位置 | JS 文件 | 路由器 | 能否正常工作 |
|:---|:---|:---|:---|
| 本地构建目录 | `main.9af7d269.js` | HashRouter ✓ | ✓ |
| gh-pages 分支 | `main.9af7d269.js` | HashRouter ✓ | ✓ |
| **线上 CDN** | **`main.edb82f08.js`** | **BrowserRouter ❌** | **❌** |

**结论：`gh-pages -d build` 成功将新版本推送到 gh-pages 分支，但 GitHub Pages 的 CDN（Fastly）仍在提供旧版本的缓存。**

**影响链：**

```
旧版 index.html (CDN 缓存)
        ↓
引用旧版 main.edb82f08.js
        ↓
BrowserRouter 启动
        ↓
读取 pathname = "/that-math-things/"
        ↓
路由不匹配 → 页面空白
```

这就是用户"页面不完整"的真正原因 — 不是代码问题，而是 CDN 缓存问题。

### 验证：查看 gh-pages 分支内容

```bash
# 确认分支内容正确
git show origin/gh-pages:index.html | grep -o 'main\.[^"]*\.js'
# → main.9af7d269.js  ✓
```

### 彻底修复

**方案：强制 CDN 缓存刷新**

由于 GitHub Pages CDN（Fastly）的默认缓存 TTL 较长，需要触发缓存失效。

做了两件事：

1. **修改 `public/index.html` 标题**（触发构建产物变化）

```diff
- <title>React App</title>
+ <title>那年那数那些事</title>
```

2. **重建并重新部署**

```bash
npm run build   # 生成新构建
npm run deploy  # 推送到 gh-pages 分支
```

**验证 CDN 是否刷新：**

```bash
# 循环轮询，观察 JS 文件是否更新
for i in 1 2 3 4 5; do
  sleep 2
  echo "Attempt $i: $(curl -s https://soapgu.github.io/that-math-things/index.html | grep -o 'main\.[^"]*\.js')"
done

# 输出：
# Attempt 1: main.edb82f08.js  ❌  (还缓存旧版)
# Attempt 2: main.edb82f08.js  ❌
# Attempt 3: main.9af7d269.js  ✓  (CDN 刷新！)
```

约 10 秒后，CDN 缓存更新，开始提供新版 HashRouter 应用。

---

## 总结

### 问题时序图

```
BrowserRouter + homepage  → 子路径路由不匹配 → 页面空白
         ↓
  切换到 HashRouter
         ↓
  gh-pages 推送成功       → CDN 还在缓存旧版 → 用户仍然看到空白
         ↓
  修改 HTML + 重新部署    → CDN 缓存失效     → 新版上线
```

### 核心教训

| # | 经验 | 说明 |
|:---|:---|---|
| 1 | **子路径部署用 HashRouter** | `BrowserRouter` 依赖真实路径，子路径下路由不匹配，`HashRouter` 不受此限制 |
| 2 | **GitHub Pages 有 CDN 缓存** | `gh-pages -d build` 推送到分支只是第一步，CDN 可能需要几分钟到十几分钟才能刷新 |
| 3 | **验证方法** | `curl` 直接访问线上 URL，对比 JS 文件 hash；`git show origin/gh-pages:index.html` 检查分支内容 |
| 4 | **强制刷新 CDN** | 修改内容后重新构建部署（产生新的文件 hash），或等待 CDN TTL 过期（通常 5-10 分钟） |

### 最终配置

```jsx
// src/index.js
import { HashRouter } from 'react-router-dom';  // ← 非 BrowserRouter

root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <App />
      </HashRouter>
    </ConfigProvider>
  </React.StrictMode>
);
```

```jsx
// AppLayout 菜单导航防默认跳转
<Menu
  onClick={({ key, domEvent }) => {
    domEvent.preventDefault();  // ← 阻止 <a> 默认导航
    navigate(key);
  }}
/>
```

```json
// package.json
{
  "homepage": "https://soapgu.github.io/that-math-things",  // 保留，构建需要
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```
