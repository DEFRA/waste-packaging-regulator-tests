import ExcelJS from 'exceljs'

// The CSoC Excel report has a heading in row 1, column headings in row 2 and
// one organisation per row after that. Each cancellation block has a merged
// "Cancellation N" heading in row 1, above its column headings.
const HEADINGS_ROW = 2

// Only merged cells are block headings: the report heading shares their row.
function blockHeadings(row, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const cell = row.getCell(index + 1)
    return cell.isMerged ? cell.value : null
  })
}

export async function readReport(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  // exceljs row values start at index 1.
  const headers = worksheet.getRow(HEADINGS_ROW).values.slice(1)
  const headingsAbove = blockHeadings(
    worksheet.getRow(HEADINGS_ROW - 1),
    headers.length
  )

  // Every block repeats the same column headings, so a cancellation column is
  // keyed by its block, as in 'Cancellation 1: Reason'.
  const keys = headers.map((header, i) =>
    headingsAbove[i] ? `${headingsAbove[i]}: ${header}` : header
  )

  const rows = []
  for (
    let rowNumber = HEADINGS_ROW + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const values = worksheet.getRow(rowNumber).values
    rows.push(
      Object.fromEntries(keys.map((key, i) => [key, values[i + 1] ?? null]))
    )
  }

  return {
    heading: worksheet.getCell(1, 1).value,
    headers,
    blockHeadings: [...new Set(headingsAbove.filter(Boolean))],
    rows
  }
}
