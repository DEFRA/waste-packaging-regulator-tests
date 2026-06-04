class Page {
  constructor(page) {
    this.page = page
  }

  get pageHeading() {
    return this.page.locator('h1')
  }

  async open(path) {
    await this.page.goto(path)
  }
}

export { Page }
