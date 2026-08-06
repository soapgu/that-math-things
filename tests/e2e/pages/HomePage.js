/** 首页 Page Object。 */
export class HomePage {
  /**
   * @param {import('@playwright/test').Page} page Playwright 页面。
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * 打开应用首页。
   * @param {string} baseURL 站点 baseURL。
   * @returns {Promise<void>}
   */
  async goto(baseURL) {
    await this.page.goto(baseURL, { waitUntil: 'networkidle' });
  }

  /**
   * 点击「计算训练」入口卡片。
   * @returns {Promise<void>}
   */
  async clickPractice() {
    await this.page.getByRole('heading', { name: '计算训练', exact: true }).click();
  }

  /**
   * 点击「错题列表」入口卡片。
   * @returns {Promise<void>}
   */
  async clickProblemList() {
    await this.page.getByRole('heading', { name: '错题列表', exact: true }).click();
  }

  /**
   * 点击「九九乘法」入口卡片。
   * @returns {Promise<void>}
   */
  async clickMultiplication() {
    await this.page.getByRole('heading', { name: '九九乘法', exact: true }).click();
  }

  /**
   * 首页标题是否可见。
   * @returns {Promise<boolean>}
   */
  async isReady() {
    return await this.page.getByRole('heading', { name: '那年那数那些事', exact: true }).isVisible();
  }
}
