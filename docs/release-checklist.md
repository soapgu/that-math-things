# v2.5.0 发布检查清单

> 发布日期：2026-07-29  
> 目标分支：`main`  
> 发布标签：`v2.5.0`  
> 支持设备：宽度 `768px` 及以上的平板和电脑

## 1. 工作区与版本

- [x] 当前仓库为 `soapgu/that-math-things`。
- [x] 当前分支为 `main`，发布准备前与 `origin/main` 同步。
- [x] 发布准备开始时工作区无未提交变更。
- [x] `package.json` 版本为 `2.5.0`。
- [x] `package-lock.json` 根版本和项目版本均为 `2.5.0`。
- [x] 页面展示版本为 `v2.5.0`。
- [x] 发布提交 `32e557b` 已推送，且对应主分支 CI 全绿。

## 2. 本地质量门禁

- [x] `npm test`：23 个测试文件、228 个用例全部通过，耗时 8.59 秒。
- [x] `npm run build`：生产构建成功，无新增构建告警，耗时 5.73 秒。
- [x] `CI=1 npm run test:e2e`：9 个 spec 文件、62 个用例全部通过，耗时 51.4 秒。
- [x] E2E 结束后 `5173` 端口无监听进程。
- [x] `git diff --check` 通过。

## 3. 设备与可访问性矩阵

- [x] `768px`：首页、设置、做题、辅助、结果、统计和订正无横向溢出。
- [x] `768 × 1024` 与 `1024 × 768` 切换后训练状态保持。
- [x] `1024px` 和 `1440px` 主要页面与辅助动画布局正常。
- [x] `767px` 显示不支持设备提示，恢复到 `768px` 后应用正常显示。
- [x] 设置、做题、辅助、结果和订正关键操作可通过键盘到达。
- [x] 焦点样式、Enter 提交、文字状态和减少动态效果检查通过。
- [x] 手机小屏未列入本版本支持范围。

## 4. CI 与发布

- [x] GitHub Actions 自动执行 Vitest、生产构建和 Playwright E2E。
- [x] E2E 最终失败时上传截图、Trace 和 HTML 报告，保留 7 天。
- [x] Phase 3 已完成同一提交连续三轮完整 E2E 无偶发失败。
- [x] `v2.5.0` 标签由通过 CI 的发布提交创建。
- [x] GitHub Release 已创建，Release Notes 包含功能摘要、质量基线和已知限制。
- [x] `npm run deploy` 已构建生产产物，并将其发布到 `gh-pages`。
- [x] GitHub Pages 部署提交为 `076fe62f`，状态为 built。

## 5. 发布后线上冒烟

线上地址：<https://soapgu.github.io/that-math-things/>

- [x] 首页可打开并显示 `v2.5.0`。
- [x] HashRouter 首页、训练设置、做题和直接刷新路径正常。
- [x] 辅助提醒及进位/退位方法演示可进入。
- [x] 可完成一轮训练并进入结算页。
- [x] 故意答错后可从结果页进入订正并完成。
- [x] `768px` 平板视口核心流程无横向溢出。
- [x] `1024px` 电脑视口核心流程正常。
- [x] `767px` 显示“目前网站只支持电脑和 Pad 访问”。
- [x] 线上浏览器控制台无未处理 error 或 warning。

## 6. Release Notes

### 版本摘要

- 建立 GitHub Actions 持续集成，自动运行 Vitest、生产构建和 Playwright E2E。
- Playwright 自动管理 Vite 服务生命周期，执行结束不遗留 `5173` 端口。
- 将平板和电脑设备矩阵、键盘操作、焦点样式、减少动态效果与控制台检查固化为发布门禁。
- 统一包信息、页面展示、Git 标签和 GitHub Release 的 `v2.5.0` 版本标识。
- 建立可重复、可追溯的发布检查清单。

### 已知限制

- 手机小屏暂不支持；宽度低于 `768px` 时仅显示设备提示。
- 学习记录保存在当前浏览器的 `localStorage`，暂不支持跨设备同步。
- 本版本不新增学习题型，重点是工程质量和发布体系。

## 7. 发布结果

- 发布提交：[`32e557b`](https://github.com/soapgu/that-math-things/commit/32e557b4c397ed617e9c8129db384b0e478f571f)
- 主分支 CI：[基础质量检查 #30417340236](https://github.com/soapgu/that-math-things/actions/runs/30417340236)，2 分 13 秒，全部通过
- GitHub Release：[v2.5.0 发布体系与质量基线](https://github.com/soapgu/that-math-things/releases/tag/v2.5.0)
- GitHub Pages 部署：`076fe62f`，状态 built
- 线上冒烟时间：2026-07-29
- P1/P2 缺陷：无
