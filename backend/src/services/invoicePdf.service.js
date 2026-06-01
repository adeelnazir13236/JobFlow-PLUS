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

export async function generateInvoicePdf(id, currentUser) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: {
      organization: true,
      customer: true,
      contract: true,
      billingRule: true,
      payments: {
        include: { receivedBy: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { paymentDate: "desc" }
      }
    }
  });

  if (!invoice) {
    throw new ApiError(404, "Invoice not found");
  }

  const paidAmount = Number(invoice.paidAmount || 0);
  const balanceAmount = Number(invoice.balanceAmount ?? invoice.amount ?? 0);

  return createPdf(`Invoice ${invoice.invoiceNumber}`, (doc) => {
    addHeader(doc, invoice.organization, "INVOICE", invoice.invoiceNumber);
    addInfoGrid(
      doc,
      "Customer",
      [
        { label: "Name", value: invoice.customer?.name },
        { label: "Phone", value: invoice.customer?.phone },
        { label: "Email", value: invoice.customer?.email },
        { label: "Address", value: customerAddress(invoice.customer) }
      ],
      "Invoice Information",
      [
        { label: "Number", value: invoice.invoiceNumber },
        { label: "Invoice Date", value: formatDate(invoice.invoiceDate) },
        { label: "Due Date", value: formatDate(invoice.dueDate) },
        { label: "Status", value: invoice.status }
      ]
    );

    if (invoice.contract) {
      addInfoGrid(
        doc,
        "Contract Information",
        [
          { label: "Contract Number", value: invoice.contract.contractNumber },
          { label: "Contract Title", value: invoice.contract.title }
        ],
        "Billing",
        [
          { label: "Billing Cycle", value: invoice.billingRule?.billingCycle },
          { label: "Payment Status", value: invoice.paymentStatus }
        ]
      );
    }

    addSectionTitle(doc, "Invoice Items");
    addSimpleTable(
      doc,
      [
        { label: "Description", width: 371, maxLength: 92, value: () => invoice.notes || invoice.contract?.title || "Contract billing invoice" },
        { label: "Qty", width: 55, align: "right", value: () => "1" },
        { label: "Amount", width: 97, align: "right", value: () => formatAmount(invoice.amount) }
      ],
      [{}]
    );

    addTotals(doc, [
      { label: "Subtotal", value: invoice.amount },
      { label: "Tax", value: 0 },
      { label: "Total", value: invoice.amount, strong: true }
    ]);

    addSectionTitle(doc, "Payment Summary");
    addSimpleTable(
      doc,
      [
        { label: "Payment", width: 130, value: (payment) => payment._summary || payment.paymentNumber || payment.invoiceNumber || `PAY-${payment.id}` },
        { label: "Date", width: 90, value: (payment) => formatDate(payment.paymentDate) },
        { label: "Method", width: 100, value: (payment) => payment.paymentMethod },
        { label: "Received By", width: 110, value: (payment) => payment._summary ? "" : payment.receivedBy?.name || "N/A" },
        { label: "Amount", width: 93, align: "right", value: (payment) => payment._summary ? "" : formatAmount(payment.amount || payment.paidAmount) }
      ],
      compactRows(invoice.payments, 5, "payments")
    );
    addTotals(doc, [
      { label: "Paid Amount", value: paidAmount },
      { label: "Outstanding", value: balanceAmount, strong: true }
    ]);
    addParagraph(doc, "Notes", invoice.notes, 160);
  });
}
