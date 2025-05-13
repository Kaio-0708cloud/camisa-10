const express = require('express');
const dotenv = require('dotenv');
const Stripe = require('stripe');
const axios = require('axios');
const cors = require('cors');
const path = require("path");

dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = 3000;

const asaasClient = axios.create({
  baseURL: 'https://www.asaas.com/api/v3',
  headers: {
    'access_token': process.env.ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/create-checkout-session", async (req, res) => {
  const items = req.body.items;

  const lineItems = items.map(item => ({
    price_data: {
      currency: 'brl',
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: 'https://payments-stripe.vercel.app/success.html',
      cancel_url: 'https://payments-stripe.vercel.app/cancel.html',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Erro ao criar sessão:", error);
    res.status(500).json({ error: "Erro ao criar sessão" });
  }
});

app.post("/api/create-asaas-pix-checkout", async (req, res) => {
  const { items, customer } = req.body;

  // Validações básicas
  if (!items?.length) return res.status(400).json({ error: "Carrinho vazio" });
  if (!customer?.cpfCnpj) return res.status(400).json({ error: "CPF obrigatório" });

  try {
    // 1. Calcula total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // 2. Cria cliente (permite repetição)
    const customerResponse = await asaasClient.post("/customers", {
      name: customer.name || "Cliente",
      cpfCnpj: customer.cpfCnpj.replace(/\D/g, ''),
      email: customer.email || "sem@email.com",
      mobilePhone: customer.phone?.replace(/\D/g, '') || "00000000000",
      address: customer.address || "Não informado"
    });

    // 3. Cria cobrança PIX
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vencimento amanhã

    const paymentResponse = await asaasClient.post("/payments", {
      billingType: "PIX",
      customer: customerResponse.data.id,
      value: total.toFixed(2),
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Pedido ${new Date().toLocaleDateString()}`,
      externalReference: `ref-${Date.now()}`,
      notificationDisabled: false
    });

    // Retorna dados do PIX
    res.json({
      success: true,
      paymentId: paymentResponse.data.id,
      checkoutUrl: paymentResponse.data.invoiceUrl,
      qrCode: paymentResponse.data.pixQrCode,
      qrCodeImage: paymentResponse.data.pixQrCodeImage,
      expirationDate: paymentResponse.data.expirationDate
    });

  } catch (error) {
    console.error("Erro Asaas:", error.response?.data || error.message);
    res.status(500).json({
      error: "Erro ao criar pagamento",
      details: error.response?.data || error.message
    });
  }
});
module.exports = app;
