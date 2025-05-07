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
  const { items, email } = req.body;

  try {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const customerResponse = await asaasClient.post("/customers", {
      name: email.split("@")[0],
      email: email
    });

    if (!customerResponse.data?.id) {
      throw new Error("ID do cliente não retornado pela API do Asaas.");
    }

    const customerId = customerResponse.data.id;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateString = dueDate.toISOString().split("T")[0];

    const paymentResponse = await asaasClient.post("/payments", {
      billingType: "PIX",
      customer: customerId,
      value: total,
      dueDate: dueDateString,
      description: `Pedido de ${items.map((i) => i.name).join(", ")}`,
      externalReference: `pedido-${Date.now()}`,
      notificationDisabled: false,
      autoRedirect: false
    });

    if (!paymentResponse.data?.id) {
      throw new Error("Erro ao criar pagamento PIX: resposta inválida da API.");
    }

    res.json({
      paymentId: paymentResponse.data.id,
      checkoutUrl: `https://www.asaas.com/pay/${paymentResponse.data.id}`,
      qrCode: paymentResponse.data.pixQrCode,
      qrCodeImage: paymentResponse.data.pixQrCodeImage
    });

  } catch (error) {
    console.error("Erro ao criar pagamento PIX:", error.response?.data || error.message);
    
    // Logando o erro para entender melhor
    console.log("Detalhes do erro:", error);

    // Retorna um erro com detalhes no formato JSON
    res.status(500).json({
      error: "Erro ao criar pagamento PIX.",
      details: error.response?.data || error.message
    });
  }
});

module.exports = app;
