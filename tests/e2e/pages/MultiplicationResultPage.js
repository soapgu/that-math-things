import { expect } from '@playwright/test';

/** 九九乘法结算页 Page Object。 */
export class MultiplicationResultPage {
  constructor(page) {
    this.page = page;
  }

  async waitForReady() {
    await this.page.getByRole('heading', { name: '闯关结果' }).waitFor();
  }

  async expectPerfect(total) {
    await this.waitForReady();
    await expect(this.page.locator('.multiplication-result-stars')).toHaveAttribute('aria-label', '3星');
    await expect(this.page.getByText('100', { exact: true })).toBeVisible();
    await expect(this.page.getByText(`/ ${total}`, { exact: true })).toBeVisible();
  }

  async replay() {
    await this.page.getByRole('button', { name: '再来一局' }).click();
  }

  async backToSettings() {
    await this.page.getByRole('button', { name: '返回难度选择' }).click();
  }
}
