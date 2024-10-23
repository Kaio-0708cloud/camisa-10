const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const pagseguroEmail = '';
const pagseguroToken = '';

// Rota para gerar uma sessão de pagamento
app.post('/api/pagseguro/session', async (req, res) => {
  const { items, address, total } = req.body;

  try {
    const response = await axios.post('https://ws.sandbox.pagseguro.uol.com.br/v2/checkout', null, {
      params: {
        email: pagseguroEmail,
        token: pagseguroToken,
        currency: 'BRL',
        // Detalhes do pagamento
        itemId1: items[0].id,
        itemDescription1: items[0].description,
        itemAmount1: items[0].amount,
        itemQuantity1: items[0].quantity,
        shippingAddressStreet: address
        // Mais parâmetros...
      }
    });

    res.json({ code: response.data.code });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao gerar sessão de pagamento.");
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});