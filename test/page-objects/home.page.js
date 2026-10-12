import { Page } from './page.js'

class HomePage extends Page {
  // eslint-disable-next-line no-useless-constructor
  constructor(page) {
    super(page)
  }

  get homeHeading() {
    return this.page.getByRole('heading', {
      name: 'View certificates and statements of compliance'
    })
  }

  async open() {
    await super.open('/')
  }
}

export { HomePage }
