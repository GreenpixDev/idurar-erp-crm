const { MailtrapClient } = require("mailtrap");
const mongoose = require('mongoose');

const client = new MailtrapClient({ token: process.env.MAILTRAP_TOKEN });

const sender = {
  email: "hello@demomailtrap.co",
  name: "Test",
};

const mail = async (req, res) => {
  try {
    const invoice = await mongoose.model('Invoice').findById(req.body.id).populate('client');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        result: null,
        message: `Invoice not found`,
      });
    }

    const email = invoice?.client?.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `No email address found for this client`,
      });
    }

    await client.send({
      from: sender,
      to: [{ email }],
      subject: "iDURAR Invoice",
      html: invoiceToHtml(invoice),
      category: "Integration Test",
    });

    return res.status(200).json({
      success: true,
      result: null,
      message: `Email sent successfully to ${email}. Invoice: ${invoice}`,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: error?.message ?? `Failed to send email`,
    });
  }
};

function invoiceToHtml(invoice) {
  const fmt = (dateObj) => {
    const d = new Date(dateObj?.$date ?? dateObj);
    return isNaN(d) ? "N/A" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const money = (n) => Number(n ?? 0).toFixed(2);

  const rows = (invoice.items ?? []).map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.itemName}</td>
      <td>${item.quantity}</td>
      <td>${money(item.price)}</td>
      <td>${money(item.total)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice #${invoice.number}</title>
</head>
<body>
 
  <h1>INVOICE</h1>
 
  <p><strong>Invoice #:</strong> ${invoice.number}</p>
  <p><strong>Status:</strong> ${invoice.status}</p>
  <p><strong>Payment Status:</strong> ${invoice.paymentStatus}</p>
  <p><strong>Date:</strong> ${fmt(invoice.date)}</p>
  <p><strong>Due Date:</strong> ${fmt(invoice.expiredDate)}</p>
 
  <hr>
 
  <h2>Items</h2>
 
  <table border="1" cellpadding="5" cellspacing="0">
    <thead>
      <tr>
        <th>#</th>
        <th>Item Name</th>
        <th>Quantity</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
 
  <hr>
 
  <p><strong>Subtotal:</strong> ${money(invoice.subTotal)}</p>
  <p><strong>Discount:</strong> ${money(invoice.discount)}</p>
  <p><strong>Tax Rate:</strong> ${invoice.taxRate ?? 0}%</p>
  <p><strong>Tax Total:</strong> ${money(invoice.taxTotal)}</p>
  <p><strong>Credit:</strong> ${money(invoice.credit)}</p>
  <p><strong>Total:</strong> ${money(invoice.total)}</p>
 
  <hr>
 
  <p><strong>Currency:</strong> ${invoice.currency ?? "N/A"}</p>
  <p><strong>Approved:</strong> ${invoice.approved ? "Yes" : "No"}</p>
  <p><strong>Overdue:</strong> ${invoice.isOverdue ? "Yes" : "No"}</p>
 
</body>
</html>`;
}

module.exports = mail;