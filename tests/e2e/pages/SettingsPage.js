export class SettingsPage {
  constructor(page) {
    this.page = page
  }

  async waitForReady() {
    await this.page.getByRole('button', { name: '开始训练' }).waitFor({ state: 'visible', timeout: 10000 })
  }

  async isVisible() {
    return this.page.getByRole('button', { name: '开始训练' }).isVisible()
  }

  async selectQuestionCount(count) {
    await this.page.getByRole('radio', { name: `${count} 题` }).click()
  }

  async setAssistEnabled(enabled) {
    const isChecked = await this.page.getByRole('switch').isChecked()
    if (enabled !== isChecked) {
      await this.page.getByRole('switch').click()
    }
  }

  async selectBorrowOnesMethod(method) {
    switch (method) {
      case 'breakTen':
        await this.page.getByRole('radio', { name: /破十法/ }).click()
        break
      case 'bridgeTen':
        await this.page.getByRole('radio', { name: /平十法/ }).click()
        break
    }
  }

  async setCarryBorrowProb(level) {
    const stars = this.page.locator('.ant-rate li')
    await stars.nth(level - 1).click()
  }

  async clickStart() {
    await this.page.getByRole('button', { name: '开始训练' }).click()
  }

  async clickStats() {
    await this.page.getByRole('button', { name: '统计数据' }).click()
  }
}
