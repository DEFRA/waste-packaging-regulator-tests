import ExcelJS from 'exceljs'

// The CSoC Excel report has a heading in row 1, column headings in row 2 and
// one organisation per row after that.
const HEADINGS_ROW = 2

export async function readReport(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  // exceljs row values start at index 1.
  const headers = worksheet.getRow(HEADINGS_ROW).values.slice(1)
  const rows = []
  for (
    let rowNumber = HEADINGS_ROW + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const values = worksheet.getRow(rowNumber).values
    rows.push(
      Object.fromEntries(
        headers.map((header, i) => [header, values[i + 1] ?? null])
      )
    )
  }

  return { heading: worksheet.getCell(1, 1).value, headers, rows }
}
