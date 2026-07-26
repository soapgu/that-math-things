export class CorrectionPage {
  constructor(page) {
    this.page = page
  }

  async waitForReady() {
    await this.page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 })
  }

  async answer(value) {
    const input = this.page.locator('input[type="text"]').first()
    await input.fill(String(value))
  }

  async clickNext() {
    await this.page.getByRole('button', { name: '下一题' }).click()
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter')
  }

  async isComplete() {
    const content = await this.page.locator('.ant-layout-content').textContent()
    return content.includes('全部订正完成')
  }
}
