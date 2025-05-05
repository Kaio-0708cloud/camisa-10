const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const app = express();

const stripe = new Stripe("sk_test_suask_test_51RHQgYPXiMUwkGHiAA4zNqNxTRtlaizO1wJwzG3t4jyv9Jx7kIqwTPP59lHrlBYSwsni4LK6YAulyrUIusP0bJ1G005KmuvU96");

app.use(cors());
app.use(express.json());

app.post("/create-checkout-session", async (req, res) => {
  const { items, address } = req.body;

  const line_items = items.map(item => ({
    price_data: {
      currency: "brl",
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100), // valor em centavos
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    success_url: "http://localhost:3000/sucesso",
    cancel_url: "http://localhost:3000/cancelado",
    metadata: {
      address,
    },
  });

  res.json({ url: session.url });
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));