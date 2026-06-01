import PDFDocument from "pdfkit";

const pageMargin = 36;
const tableLineHeight = 14;
const footerReserve = 38;

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "N/A";
}

export function formatDateTime(value = new Date()) {
  return new Date(value).toLocaleString();
}

export function formatAmount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function customerAddress(customer = {}) {
  return customer.address || [customer.area, customer.city].filter(Boolean).join(", ") || "";
}

export function organizationLines(organization = {}) {
  return [
    organization.name,
    organization.address,
    organization.phone ? `Phone: ${organization.phone}` : null,
    organization.email ? `Email: ${organization.email}` : null
  ].filter(Boolean);
}

export function createPdf(title, build) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: pageMargin, bufferPages: true, autoFirstPage: true });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    try {
      doc.info.Title = title;
      build(doc);
      addPageFooters(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function addHeader(doc, organization, documentTitle, documentNumber) {
  const startY = doc.y;
  doc
    .fontSize(15)
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .text(organization?.name || "JOBFLOW PLUS", pageMargin, startY, { width: 300 });

  doc.font("Helvetica").fontSize(8).fillColor("#475569");
  organizationLines(organization).slice(1).forEach((line) => doc.text(line, { width: 300 }));

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0f172a")
    .text(documentTitle, 350, startY, { width: 195, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#475569")
    .text(documentNumber, 350, doc.y + 4, { width: 195, align: "right" });

  doc.y = Math.max(doc.y, startY + 52);
  doc.moveTo(pageMargin, doc.y).lineTo(559, doc.y).strokeColor("#e2e8f0").stroke();
  doc.moveDown(0.8);
}

export function addInfoGrid(doc, leftTitle, leftRows, rightTitle, rightRows) {
  const y = doc.y;
  const leftHeight = addInfoBlock(doc, leftTitle, leftRows, pageMargin, y, 245);
  const rightHeight = addInfoBlock(doc, rightTitle, rightRows, 314, y, 245);
  doc.y = y + Math.max(leftHeight, rightHeight) + 10;
}

function addInfoBlock(doc, title, rows, x, y, width) {
  let cursorY = y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(title, x, cursorY, { width });
  cursorY += 13;
  doc.font("Helvetica").fontSize(8).fillColor("#475569");
  rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== "").slice(0, 5).forEach((row) => {
    doc.text(`${row.label}: ${compactText(row.value, 64)}`, x, cursorY, { width, height: 10 });
    cursorY += 11;
  });
  return cursorY - y;
}

export function addSectionTitle(doc, title) {
  if (!hasSpace(doc, 26)) {
    return;
  }
  doc.moveDown(0.25);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text(title);
  doc.moveDown(0.3);
}

export function addSimpleTable(doc, columns, rows) {
  const startX = pageMargin;
  const tableWidth = 523;
  const headerY = doc.y;

  if (!hasSpace(doc, 48)) {
    return;
  }

  doc.rect(startX, headerY, tableWidth, 19).fill("#f8fafc");
  doc.fillColor("#334155").font("Helvetica-Bold").fontSize(8);

  let x = startX;
  columns.forEach((column) => {
    doc.text(column.label, x + 5, headerY + 6, { width: column.width - 10, align: column.align || "left" });
    x += column.width;
  });

  doc.y = headerY + 19;
  doc.font("Helvetica").fillColor("#334155").fontSize(7.5);

  rows.forEach((row) => {
    if (!hasSpace(doc, tableLineHeight + 8)) {
      return;
    }

    const y = doc.y;
    const values = columns.map((column) => compactText(column.value(row) ?? "", column.maxLength || 68));
    const height = tableLineHeight + 7;

    if (row._shade) {
      doc.rect(startX, y, tableWidth, height).fill("#f8fafc").fillColor("#334155");
    }

    x = startX;
    values.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + 5, y + 5, { width: column.width - 10, height: tableLineHeight, align: column.align || "left" });
      x += column.width;
    });

    doc.moveTo(startX, y + height).lineTo(startX + tableWidth, y + height).strokeColor("#e2e8f0").stroke();
    doc.y = y + height;
  });

  doc.moveDown(0.5);
}

export function addTotals(doc, rows) {
  if (!hasSpace(doc, 22 + rows.length * 16)) {
    return;
  }
  const x = 354;
  const width = 205;

  rows.forEach((row, index) => {
    const y = doc.y;
    if (row.strong) {
      doc.moveTo(x, y).lineTo(x + width, y).strokeColor("#cbd5e1").stroke();
      doc.y += 6;
    }
    doc.font(row.strong ? "Helvetica-Bold" : "Helvetica").fontSize(row.strong ? 10 : 8).fillColor("#0f172a");
    doc.text(row.label, x, doc.y, { width: 100 });
    doc.text(formatAmount(row.value), x + 100, doc.y - 10, { width: 105, align: "right" });
    doc.y += index === rows.length - 1 ? 14 : 9;
  });
}

export function addParagraph(doc, title, value, maxLength = 240) {
  if (!value) {
    return;
  }

  addSectionTitle(doc, title);
  if (!hasSpace(doc, 28)) {
    return;
  }
  doc.font("Helvetica").fontSize(8).fillColor("#334155").text(compactText(value, maxLength), { align: "left", height: 34 });
}

export function compactRows(rows, maxRows, moreLabel = "additional rows") {
  if (!Array.isArray(rows) || rows.length <= maxRows) {
    return rows || [];
  }

  return [
    ...rows.slice(0, maxRows),
    { _shade: true, _summary: `+${rows.length - maxRows} ${moreLabel} not shown on this one-page PDF` }
  ];
}

export function compactText(value, maxLength = 80) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(maxLength - 3, 0))}...` : text;
}

function hasSpace(doc, requiredHeight) {
  return doc.y + requiredHeight <= doc.page.height - footerReserve;
}

function addPageFooters(doc) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const footerY = doc.page.height - doc.page.margins.bottom - 24;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#64748b")
      .text(`Generated by JOBFLOW PLUS on ${formatDateTime()}`, pageMargin, footerY, { width: 300, lineBreak: false });
    doc.text("Page 1 of 1", 444, footerY, { width: 115, align: "right", lineBreak: false });
  }
}
