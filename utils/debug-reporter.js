export default class DebugReporter {
  onTestEnd(test, result) {
    if (result.attachments.length > 0) {
      console.log(`[debug-reporter] ${test.title} attachments:`)
      result.attachments.forEach((a) => {
        console.log(
          `  name=${a.name} contentType=${a.contentType} hasBody=${!!a.body} path=${a.path}`
        )
      })
    }
  }
}
