/** 九九乘法设置页 Page Object。 */
export class MultiplicationSettingsPage {
  constructor(page) {
    this.page = page;
  }

  async goto(baseURL) {
    await this.page.goto(`${baseURL}#/multiplication`, { waitUntil: 'networkidle' });
    await this.waitForReady();
  }

  async waitForReady() {
    await this.page.getByRole('heading', { name: '九九乘法', exact: true }).waitFor();
    await this.page.getByRole('button', { name: '开始闯关' }).waitFor();
  }

  async selectDifficulty(difficulty) {
    await this.page.locator(`[data-difficulty="${difficulty}"]`).click();
  }

  async selectQuestionCount(count) {
    await this.page.getByRole('button', { name: `${count} 题`, exact: true }).click();
  }

  async start() {
    await this.page.getByRole('button', { name: '开始闯关' }).click();
  }
}
