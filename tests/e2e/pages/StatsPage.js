export class StatsPage {
  constructor(page) {
    this.page = page
  }

  async waitForReady() {
    await this.page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 })
  }

  async clickLatestRecord() {
    const recordLinks = this.page.locator('.ant-list-item')
    await recordLinks.first().click()
  }

  async clickCorrection() {
    await this.page.getByRole('button', { name: '订正' }).click()
  }
}
