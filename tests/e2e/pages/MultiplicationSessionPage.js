import { expect } from '@playwright/test';

/** 九九乘法答题页 Page Object。 */
export class MultiplicationSessionPage {
  constructor(page) {
    this.page = page;
  }

  get root() {
    return this.page.locator('.multiplication-session-page');
  }

  get matrix() {
    return this.page.getByRole('grid', { name: '九九乘法坐标表' });
  }

  async waitForReady() {
    await expect(this.root).toHaveAttribute('data-session-phase', 'READY');
  }

  async getPhase() {
    return this.root.getAttribute('data-session-phase');
  }

  async getQuestion() {
    const text = await this.page.locator('.multiplication-formula').innerText();
    const match = text.match(/(\d)\s*×\s*(\d)\s*=\s*\?/);
    if (!match) throw new Error(`无法解析乘法算式：${text}`);
    const a = Number(match[1]);
    const b = Number(match[2]);
    return { a, b, answer: a * b, key: `${a}×${b}` };
  }

  async getProgress() {
    const text = await this.page.locator('.multiplication-session-meta').innerText();
    const match = text.match(/第\s*(\d+)\/(\d+)\s*题/);
    if (!match) throw new Error(`无法解析题目进度：${text}`);
    return { current: Number(match[1]), total: Number(match[2]) };
  }

  async submit(value, { enter = false } = {}) {
    const question = await this.getQuestion();
    const input = this.page.getByRole('textbox', { name: `${question.a}乘${question.b}的答案` });
    if (await input.count()) {
      await input.fill(String(value));
      if (enter) await input.press('Enter');
      else await this.page.getByRole('button', { name: '提交答案' }).click();
    } else {
      await this.page.getByRole('button', { name: `选择答案 ${value}`, exact: true }).click();
    }
    await expect(this.page.getByRole('button', { name: /下一题|查看结果/ })).toBeFocused();
  }

  async submitCorrect(options) {
    const question = await this.getQuestion();
    await this.submit(question.answer, options);
    await expect(this.page.getByText(`回答正确：${question.a} × ${question.b} = ${question.answer}`)).toBeVisible();
    return question;
  }

  async submitWrong(options) {
    const question = await this.getQuestion();
    const input = this.page.getByRole('textbox', { name: `${question.a}乘${question.b}的答案` });
    let wrong = question.answer + 100;
    if (!(await input.count())) {
      const labels = await this.page.locator('.multiplication-choices button').evaluateAll(
        (buttons) => buttons.map((button) => button.getAttribute('aria-label')),
      );
      const wrongLabel = labels.find((label) => label && label !== `选择答案 ${question.answer}`);
      const match = wrongLabel?.match(/选择答案 (\d+)/);
      if (!match) throw new Error(`找不到 ${question.key} 的错误选项`);
      wrong = Number(match[1]);
    }
    await this.submit(wrong, options);
    await expect(this.page.getByText(new RegExp(`你的答案是 ${wrong}，正确答案`))).toBeVisible();
    return question;
  }

  async next(expectedIndex) {
    const nextButton = this.page.getByRole('button', { name: /下一题/ });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }
    await expect.poll(async () => (await this.getProgress()).current).toBe(expectedIndex + 1);
    await this.waitForReady();
  }

  async viewResult() {
    await expect(this.root).toHaveAttribute('data-session-phase', 'FINISHED');
    await this.page.getByRole('button', { name: /查看结果/ }).click();
  }

  async completeRound({ wrongAt = new Set(), useEnterAt = new Set(), collectQuestions = false } = {}) {
    const questions = [];
    const { current, total } = await this.getProgress();
    for (let index = current; index <= total; index += 1) {
      await this.waitForReady();
      const question = wrongAt.has(index)
        ? await this.submitWrong({ enter: useEnterAt.has(index) })
        : await this.submitCorrect({ enter: useEnterAt.has(index) });
      if (collectQuestions) questions.push(question);
      if (index < total) await this.next(index);
    }
    return questions;
  }

  answeredCellCount() {
    return this.matrix.locator('[data-kind^="history-"], [data-kind^="target-"]').count();
  }
}
