export class SessionPage {
  constructor(page) {
    this.page = page
  }

  async waitForReady() {
    await this.page.locator('.ant-layout-content').waitFor({ state: 'visible', timeout: 10000 })
  }

  async getQuestionText() {
    return this.page.locator('.ant-layout-content').textContent()
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

  async clickHint() {
    await this.page.getByText('需要提示').click()
  }

  async clickShowMethod() {
    await this.page.getByText('看看计算方法').click()
  }

  async clickPrevStep() {
    await this.page.getByRole('button', { name: '上一步' }).click()
  }

  async clickNextStep() {
    await this.page.getByRole('button', { name: '下一步' }).click()
  }

  async clickSkip() {
    await this.page.getByRole('button', { name: '跳过演示' }).click()
  }

  async clickReplay() {
    await this.page.getByRole('button', { name: '重播' }).click()
  }

  async clickFinishDemo() {
    await this.page.getByRole('button', { name: '返回做题' }).click()
  }

  async isInputFocused() {
    return this.page.locator('input[type="text"]').first().isFocused()
  }

  async getInputValue() {
    return this.page.locator('input[type="text"]').first().inputValue()
  }

  async isHintVisible() {
    return this.page.getByText('需要提示').isVisible()
  }

  async getTimerText() {
    const timer = this.page.locator('.ant-statistic-content')
    return timer.textContent()
  }

  async clickFinish() {
    await this.page.getByRole('button', { name: '完成' }).click()
  }
}
