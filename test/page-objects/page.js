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

  async login(email, password) {
    await this.page.getByLabel('Email address').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
    await this.page.waitForURL((url) => !url.hostname.includes('b2clogin'))
  }
}

export { Page }
