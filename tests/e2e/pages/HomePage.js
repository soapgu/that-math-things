export class HomePage {
  constructor(page) {
    this.page = page;
  }

  async goto(baseURL) {
    await this.page.goto(baseURL, { waitUntil: 'networkidle' });
  }

  async clickPractice() {
    await this.page.getByRole('heading', { name: '计算训练', exact: true }).click();
  }

  async clickProblemList() {
    await this.page.getByRole('heading', { name: '错题列表', exact: true }).click();
  }

  async isReady() {
    return await this.page.getByRole('heading', { name: '那年那数那些事', exact: true }).isVisible();
  }
}