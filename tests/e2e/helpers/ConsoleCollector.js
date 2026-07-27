/**
 * 收集浏览器控制台日志与未捕获异常，便于 a11y-console.spec.js 在多个验收节点做增量断言。
 *
 * 使用：
 *   const collector = new ConsoleCollector(page);
 *   await collector.start();
 *   // ...操作...
 *   const snap1 = collector.snapshot();
 *   // ...操作的下一节点...
 *   const diff = collector.diffSince(snap1);
 *   expect(diff.newErrors).toEqual([]);
 */
export class ConsoleCollector {
  constructor(page) {
    this.page = page;
    this.errors = [];          // pageerror：未捕获异常
    this.consoleErrors = [];   // console.error
    this.warnings = [];        // console.warning
    this.logs = [];            // console.log/info/debug
    this.started = false;

    // Vite dev 自身 info 日志前缀，不计入 warning 噪声
    this.VITE_WHITELIST = [
      '[vite]',
      '[HMR]',
      'Vite',
      'dev server',
      'wangEditor',
    ];
  }

  async start() {
    if (this.started) return;
    this.started = true;

    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') this.consoleErrors.push(text);
      else if (type === 'warning') this.warnings.push(text);
      else this.logs.push({ type, text });
    });

    this.page.on('pageerror', (err) => {
      this.errors.push(err.message);
    });
  }

  snapshot() {
    return {
      errors: [...this.errors],
      consoleErrors: [...this.consoleErrors],
      warnings: [...this.warnings],
      logs: [...this.logs],
    };
  }

  diffSince(prev) {
    const cur = this.snapshot();
    // 基于 indexOf 去重已有项；不区分顺序，仅关注新增
    const subtract = (a, b) => a.filter((x) => !b.includes(x));
    return {
      newErrors: subtract(cur.errors, prev.errors),
      newConsoleErrors: subtract(cur.consoleErrors, prev.consoleErrors),
      newWarnings: subtract(cur.warnings, prev.warnings),
    };
  }

  /**
   * 过滤出疑似 React 警告（带 Warning 前缀或关键词），排除 Vite 自身日志。
   */
  filterReactWarnings() {
    return this.warnings.filter((w) => {
      const isVite = this.VITE_WHITELIST.some((p) => w.startsWith(p) || w.includes(p));
      if (isVite) return false;
      return /warning|warn/i.test(w);
    });
  }

  /**
   * 一键断言：无未捕获异常、无 console.error、无 React 警告。
   * 由 a11y-console.spec.js 在每个节点调用；其余 spec 暂不使用。
   */
  expectClean(label = '') {
    const prefix = label ? `[${label}] ` : '';
    if (this.errors.length > 0) {
      throw new Error(`${prefix}发现未捕获异常：\n${this.errors.join('\n')}`);
    }
    if (this.consoleErrors.length > 0) {
      throw new Error(`${prefix}发现 console.error：\n${this.consoleErrors.join('\n')}`);
    }
    const react = this.filterReactWarnings();
    if (react.length > 0) {
      throw new Error(`${prefix}发现 React 警告：\n${react.join('\n')}`);
    }
  }
}