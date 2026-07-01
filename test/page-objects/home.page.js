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
}

export { HomePage }
