export class ResultPage {
  constructor(page) {
    this.page = page
  }

  async waitForReady() {
    await this.page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 })
  }

  async getScore() {
    const text = await this.page.locator('.ant-layout-content').textContent()
    const match = text.match(/(\d+)\s*分/)
    return match ? parseInt(match[1]) : null
  }

  async clickToStats() {
    await this.page.getByRole('button', { name: '统计数据' }).click()
  }

  async clickToCorrection() {
    await this.page.getByRole('button', { name: '订正' }).click()
  }

  async clickPracticeAgain() {
    await this.page.getByRole('button', { name: '再来一次' }).click()
  }

  async getAssistSummary() {
    const text = await this.page.locator('.ant-layout-content').textContent()
    return text
  }
}
