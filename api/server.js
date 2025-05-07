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

  
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio ou inválido" });
    }
    
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail inválido" });
    }
    
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (total <= 0) {
      return res.status(400).json({ error: "Valor total inválido" });
    }
  
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
  const { items, email } = req.body;
  
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Carrinho vazio ou inválido" });
    }
    
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (total <= 0) {
      return res.status(400).json({ error: "Valor total inválido" });
    }

    const customerResponse = await asaasClient.post("/customers", {
      name: email.split("@")[0] || "Cliente",
      email: email,
      notificationDisabled: false
    });

    const customerId = customerResponse.data?.id;
    if (!customerId) {
      throw new Error("Falha ao criar cliente no Asaas");
    }


    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); 

    const paymentResponse = await asaasClient.post("/payments", {
      billingType: "PIX",
      customer: customerId,
      value: total.toFixed(2),
      dueDate: dueDate.toISOString().split("T")[0],
      description: `Pedido ${Date.now()}`,
      externalReference: `ref-${Date.now()}`,
      notificationDisabled: false
    });

    if (!paymentResponse.data?.id) {
      throw new Error("Falha ao criar pagamento PIX");
    }

    res.json({
      success: true,
      paymentId: paymentResponse.data.id,
      qrCode: paymentResponse.data.pixQrCode,
      payload: paymentResponse.data.pixPayload,
      expirationDate: paymentResponse.data.dueDate,
      total: total.toFixed(2)
    });

  } catch (error) {
    console.error("Erro no PIX:", {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    res.status(500).json({ 
      error: "Erro ao processar PIX",
      details: error.response?.data || error.message
    });
  }
});
module.exports = app;
