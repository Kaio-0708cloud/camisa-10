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
    
    const customer = {
      name: "Nome do Cliente", // Nome do cliente
      email: email,
      cpfCnpj: "12345678901" // Informar CPF ou CNPJ válido
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateString = dueDate.toISOString().split('T')[0]; // Formato yyyy-MM-dd
    
    const response = await asaasClient.post('/payments', {
      billingType: 'PIX',
      customer: customer, // Passando o cliente corretamente
      value: total,
      dueDate: dueDateString,
      description: `Pedido de ${items.map(i => i.name).join(', ')}`,
      externalReference: `pedido-${Date.now()}`,
      notificationDisabled: false,
      callbackUrl: 'https://payments-stripe.vercel.app/success.html', // Corrigido para callbackUrl
      autoRedirect: true
    });

    res.json({
      checkoutUrl: `https://checkout.asaas.com/c/${response.data.id}`,
      paymentId: response.data.id
    });
  } catch (error) {
    console.error("Erro ao criar checkout PIX:", error.response?.data || error.message);
    res.status(500).json({ error: "Erro ao criar checkout PIX" });
  }
});

module.exports = app;
