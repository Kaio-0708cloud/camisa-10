const menu = document.getElementById("menu");
const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const nameInput = document.getElementById("name");
const nameWarn = document.getElementById("name-warn");
const cpfInput = document.getElementById("cpf");
const cpfWarn = document.getElementById("cpf-warn");
const addressInput = document.getElementById("address");
const addressWarn = document.getElementById("address-warn");
const emailInput = document.getElementById("email");
const emailWarn = document.getElementById("email-warn");
const checkoutStripeBtn = document.getElementById("checkout-stripe");
const checkoutPixBtn = document.getElementById("checkout-pix"); 
const paymentModal = document.getElementById("payment-modal");
const cancelPaymentBtn = document.getElementById("cancel-payment-btn");

// Configurações
const WHATSAPP_NUMBER = "5583996191523";
const STRIPE_PUBLIC_KEY = "pk_live_51RLWZiDCgQUWVX4YKX1JwdhjHT8fJ74CXCereV5tdWRFRiwOUzYKJPVJhpouBrtZmOpAxbINCI9QqUaRIpgtCjX600zNEKPFNi";

let cart = [];

// Abre o modal do carrinho
cartBtn.addEventListener("click", function() {
  updateCartModal();
  cartModal.style.display = "flex";
});

// Fecha o modal ao clicar fora
cartModal.addEventListener("click", function(event) {
  if (event.target === cartModal) {
    cartModal.style.display = "none";
  }
});

// Fecha o modal com botão
closeModalBtn.addEventListener("click", function() {
  cartModal.style.display = "none";
});

// Adiciona itens ao carrinho
menu.addEventListener("click", function(event) {
  let parentButton = event.target.closest(".add-to-cart-btn");

  if (parentButton) {
    const name = parentButton.getAttribute("data-name");
    const price = parseFloat(parentButton.getAttribute("data-price"));
    addToCart(name, price);
  }
});

// Funções do carrinho
function addToCart(name, price) {
  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name: name,
      price: price,
      quantity: 1
    });
  }
  
  updateCartModal();
}

function updateCartModal() {
  cartItemsContainer.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const cartItemElement = document.createElement("div");
    cartItemElement.classList.add("flex", "justify-between", "mb-4", "flex-col");
    
    cartItemElement.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <p class="font-bold">${item.name}</p>
          <p>Qtd: ${item.quantity}</p>
          <p class="font-medium mt-2">R$ ${item.price.toFixed(2)}</p>
        </div>
        <button class="remove-from-cart-btn" data-name="${item.name}">Remover</button>
      </div>
    `;

    total += item.price * item.quantity;
    cartItemsContainer.appendChild(cartItemElement);
  });

  cartTotal.textContent = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  cartCounter.textContent = cart.length;
}

// Remove itens do carrinho
cartItemsContainer.addEventListener("click", function(event) {
  if (event.target.classList.contains("remove-from-cart-btn")) {
    const name = event.target.getAttribute("data-name");
    removeItemCart(name);
  }
});

function removeItemCart(name) {
  const index = cart.findIndex(item => item.name === name);

  if (index !== -1) {
    const item = cart[index];

    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
    updateCartModal();
  }
}

// Validações dos campos
[nameInput, cpfInput, addressInput, emailInput].forEach(input => {
  input.addEventListener("input", function(event) {
    if (event.target.value !== "") {
      event.target.classList.remove("border-red-500");
      document.getElementById(`${event.target.id}-warn`).classList.add("hidden");
    }
  });
});

// Finalizar pedido
checkoutBtn.addEventListener("click", function() {
  if (cart.length === 0) return;
  
  let hasError = false;
  
  if (nameInput.value === "") {
    nameWarn.classList.remove("hidden");
    nameInput.classList.add("border-red-500");
    hasError = true;
  }
  
  if (cpfInput.value === "") {
    cpfWarn.classList.remove("hidden");
    cpfInput.classList.add("border-red-500");
    hasError = true;
  }
  
  if (addressInput.value === "") {
    addressWarn.classList.remove("hidden");
    addressInput.classList.add("border-red-500");
    hasError = true;
  }
  
  if (emailInput.value === "") {
    emailWarn.classList.remove("hidden");
    emailInput.classList.add("border-red-500");
    hasError = true;
  }

  if (!hasError) {
    cartModal.style.display = "none";
    paymentModal.style.display = "flex";
  }
});

// Fechar modal de pagamento
cancelPaymentBtn.addEventListener("click", function() {
  paymentModal.style.display = "none";
});

// Pagamento com Stripe (Cartão)
checkoutStripeBtn.addEventListener("click", async function () {
  if (cart.length === 0) return;

  try {
    checkoutStripeBtn.disabled = true;
    checkoutStripeBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processando...';

    const orderData = {
      name: nameInput.value,
      cpf: cpfInput.value,
      address: addressInput.value,
      email: emailInput.value,
      cart: cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      timestamp: new Date().getTime()
    };
    
    localStorage.setItem('pendingOrder', JSON.stringify(orderData));
    sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: orderData.cart,
        customer: {
          name: orderData.name,
          email: orderData.email,
          metadata: {
            cpf: orderData.cpf,
            address: orderData.address,
            localTimestamp: orderData.timestamp
          }
        },
        success_url: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.href}?payment=canceled`
      })
    });

    if (!response.ok) {
      throw new Error("Falha na comunicação com o servidor");
    }

    const session = await response.json();
    
    if (!session.id) {
      throw new Error("Não recebemos o ID da sessão do Stripe");
    }

    const stripe = Stripe(STRIPE_PUBLIC_KEY);
    const { error } = await stripe.redirectToCheckout({ 
      sessionId: session.id 
    });

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error("Erro no processamento do pagamento:", error);
    resetPaymentButtons();
    localStorage.removeItem('pendingOrder');
    sessionStorage.removeItem('pendingOrder');
    alert(`Não foi possível completar o pagamento: ${error.message}`);
  }
});

// Pagamento com PIX
checkoutPixBtn.addEventListener("click", function() {
  if (cart.length === 0) return;

  if (!nameInput.value || !cpfInput.value || !addressInput.value || !emailInput.value) {
    alert("Por favor, preencha todos os campos obrigatórios");
    return;
  }

  const orderData = {
    name: nameInput.value.trim(),
    cpf: cpfInput.value.trim().replace(/\D/g, ''),
    address: addressInput.value.trim(),
    email: emailInput.value.trim(),
    cart: cart.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })),
    timestamp: new Date().toLocaleString('pt-BR')
  };

  if (orderData.cpf.length < 11) {
    alert("CPF inválido");
    return;
  }

  checkoutPixBtn.disabled = true;
  checkoutPixBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Preparando...';

  localStorage.setItem('pendingOrder', JSON.stringify(orderData));
  sessionStorage.setItem('pendingOrder', JSON.stringify(orderData));

  sendToWhatsApp(orderData);

  setTimeout(() => {
    checkoutPixBtn.disabled = false;
    checkoutPixBtn.innerHTML = '<i class="fas fa-barcode"></i> Pagar com PIX';
  }, 2000);
});

// Função para enviar pedido para WhatsApp
function sendToWhatsApp(orderData) {
  try {
    const total = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const itemsText = orderData.cart.map(item => 
      `▪ ${item.name}
   Quantidade: ${item.quantity}
   Valor: R$ ${(item.price * item.quantity).toFixed(2)}\n`
    ).join('\n');

    const message = `*PEDIDO PARA PAGAMENTO VIA PIX* \n\n
*DETALHES DO PEDIDO:*\n
${itemsText}\n
*VALOR TOTAL:* R$ ${total.toFixed(2)}\n\n
*DADOS DO CLIENTE:*\n
• Nome: ${orderData.name}\n
• Endereço: ${orderData.address}\n
• E-mail: ${orderData.email}\n\n
*INSTRUÇÕES PARA PAGAMENTO:*\n
1. Efetue o pagamento via PIX para a chave: (83996191523)\n
2. Envie o comprovante como resposta a esta mensagem\n
3. Seu pedido será processado após confirmação do pagamento\n\n
*Obrigado por comprar conosco!*`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
    
    cart = [];
    updateCartModal();
    paymentModal.style.display = "none";
    localStorage.removeItem('pendingOrder');
    sessionStorage.removeItem('pendingOrder');

  } catch (error) {
    console.error("Erro ao enviar para WhatsApp:", error);
    alert("Pedido concluído! Por favor entre em contato conosco via WhatsApp para finalizar o pagamento via PIX.");
  }
}

function resetPaymentButtons() {
  checkoutStripeBtn.disabled = false;
  checkoutStripeBtn.innerHTML = '<i class="fab fa-cc-stripe"></i> Pagar com Cartão';
  checkoutPixBtn.disabled = false;
  checkoutPixBtn.innerHTML = '<i class="fas fa-barcode"></i> Pagar com PIX';
}

// Verificação ao carregar a página
window.addEventListener("load", function() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get("payment") === "canceled") {
    const pendingOrder = JSON.parse(localStorage.getItem('pendingOrder') || sessionStorage.getItem('pendingOrder'));
    if (pendingOrder) {
      alert("Pagamento cancelado - seu pedido foi salvo por 1 hora caso queira tentar novamente");
    }
  }
});