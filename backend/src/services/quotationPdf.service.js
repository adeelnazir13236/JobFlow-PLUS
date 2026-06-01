import prisma from "../config/prisma.js";
import ApiError from "../utils/ApiError.js";
import { tenantWhere } from "../utils/tenant.js";
import {
  addHeader,
  addInfoGrid,
  addParagraph,
  addSectionTitle,
  addSimpleTable,
  addTotals,
  compactRows,
  createPdf,
  customerAddress,
  formatAmount,
  formatDate
} from "../utils/pdf.js";

export async function generateQuotationPdf(id, currentUser) {
  const quotation = await prisma.quotation.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: {
      organization: true,
      customer: true,
      items: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!quotation) {
    throw new ApiError(404, "Quotation not found");
  }

  return createPdf(`Quotation ${quotation.quotationNumber}`, (doc) => {
    addHeader(doc, quotation.organization, "QUOTATION", quotation.quotationNumber);
    addInfoGrid(
      doc,
      "Customer",
      [
        { label: "Name", value: quotation.customer?.name },
        { label: "Phone", value: quotation.customer?.phone },
        { label: "Email", value: quotation.customer?.email },
        { label: "Address", value: customerAddress(quotation.customer) }
      ],
      "Quotation Information",
      [
        { label: "Number", value: quotation.quotationNumber },
        { label: "Date", value: formatDate(quotation.quotationDate) },
        { label: "Valid Until", value: formatDate(quotation.validUntil) },
        { label: "Status", value: quotation.status }
      ]
    );

    addSectionTitle(doc, "Items");
    addSimpleTable(
      doc,
      [
        { label: "Item", width: 125, maxLength: 42, value: (item) => item._summary || item.itemName },
        { label: "Description", width: 190, maxLength: 62, value: (item) => item._summary ? "" : item.description || "" },
        { label: "Qty", width: 55, align: "right", value: (item) => formatAmount(item.quantity) },
        { label: "Unit Price", width: 75, align: "right", value: (item) => formatAmount(item.unitPrice) },
        { label: "Total", width: 78, align: "right", value: (item) => item._summary ? "" : formatAmount(item.lineTotal) }
      ],
      compactRows(quotation.items, 8, "quotation items")
    );

    addTotals(doc, [
      { label: "Subtotal", value: quotation.subtotal },
      { label: "Discount", value: quotation.discountAmount },
      { label: "Tax", value: quotation.taxAmount },
      { label: "Grand Total", value: quotation.totalAmount, strong: true }
    ]);
    addParagraph(doc, "Notes", quotation.notes, 160);
    addParagraph(doc, "Terms & Conditions", quotation.terms, 180);
  });
}
