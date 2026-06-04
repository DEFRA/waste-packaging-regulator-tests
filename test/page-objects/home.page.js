import { Page } from './page.js'

class HomePage extends Page {
  // eslint-disable-next-line no-useless-constructor
  constructor(page) {
    super(page)
  }

  get dashboardHeading() {
    return this.page.getByRole('heading', { name: 'Regulator Dashboard' })
  }

  async open() {
    await super.open('/')
  }

  async login(email, password) {
    await this.page.getByLabel('Email address').fill(email)
    await this.page.getByLabel('Password').fill(password)
    await this.page.getByRole('button', { name: 'Sign in' }).click()
    await this.page.waitForURL((url) => !url.hostname.includes('b2clogin'))
  }
}

export { HomePage }
