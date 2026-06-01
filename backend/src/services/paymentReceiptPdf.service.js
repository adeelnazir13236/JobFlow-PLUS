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
  createPdf,
  customerAddress,
  formatAmount,
  formatDate
} from "../utils/pdf.js";

export async function generatePaymentReceiptPdf(id, currentUser) {
  const payment = await prisma.payment.findFirst({
    where: { id, ...tenantWhere(currentUser) },
    include: {
      organization: true,
      customer: true,
      invoice: { include: { payments: true } },
      contract: true,
      job: true,
      receivedBy: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  const receiptNumber = payment.paymentNumber || payment.invoiceNumber || `PAY-${String(payment.id).padStart(6, "0")}`;
  const invoiceTotal = Number(payment.invoice?.amount || payment.totalAmount || 0);
  const totalPaid = payment.invoice
    ? payment.invoice.payments
        .filter((item) => item.paymentStatus !== "CANCELLED")
        .reduce((sum, item) => sum + Number(item.amount || item.paidAmount || 0), 0)
    : Number(payment.amount || payment.paidAmount || 0);
  const remainingBalance = payment.invoice
    ? Number(payment.invoice.balanceAmount ?? Math.max(invoiceTotal - totalPaid, 0))
    : Number(payment.balanceAmount || 0);

  return createPdf(`Receipt ${receiptNumber}`, (doc) => {
    addHeader(doc, payment.organization, "PAYMENT RECEIPT", receiptNumber);
    addInfoGrid(
      doc,
      "Customer",
      [
        { label: "Name", value: payment.customer?.name },
        { label: "Phone", value: payment.customer?.phone },
        { label: "Email", value: payment.customer?.email },
        { label: "Address", value: customerAddress(payment.customer) }
      ],
      "Receipt Information",
      [
        { label: "Receipt Number", value: receiptNumber },
        { label: "Payment Date", value: formatDate(payment.paymentDate) },
        { label: "Payment Status", value: payment.paymentStatus },
        { label: "Received By", value: payment.receivedBy?.name }
      ]
    );

    addInfoGrid(
      doc,
      "Invoice Information",
      [
        { label: "Invoice Number", value: payment.invoice?.invoiceNumber || "N/A" },
        { label: "Invoice Amount", value: formatAmount(invoiceTotal) },
        { label: "Invoice Balance", value: formatAmount(remainingBalance) },
        { label: "Contract", value: payment.contract?.contractNumber || "N/A" }
      ],
      "Payment Information",
      [
        { label: "Amount Received", value: formatAmount(payment.amount || payment.paidAmount) },
        { label: "Payment Method", value: payment.paymentMethod },
        { label: "Reference Number", value: payment.referenceNumber || "N/A" },
        { label: "Job", value: payment.jobId ? `#${payment.jobId}` : "N/A" }
      ]
    );

    addSectionTitle(doc, "Receipt Detail");
    addSimpleTable(
      doc,
      [
        { label: "Description", width: 326, maxLength: 90, value: () => payment.invoice ? `Payment against invoice ${payment.invoice.invoiceNumber}` : `Payment against Job #${payment.jobId}` },
        { label: "Method", width: 100, value: () => payment.paymentMethod },
        { label: "Amount", width: 97, align: "right", value: () => formatAmount(payment.amount || payment.paidAmount) }
      ],
      [{}]
    );

    addTotals(doc, [
      { label: "Invoice Total", value: invoiceTotal },
      { label: "Total Paid", value: totalPaid },
      { label: "Remaining Balance", value: remainingBalance, strong: true }
    ]);
    addParagraph(doc, "Notes", payment.notes || payment.remarks, 180);
  });
}
