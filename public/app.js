const menu = document.getElementById("menu");
const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const cartCounter = document.getElementById("cart-count");
const addressInput = document.getElementById("address");
const nameInput = document.getElementById("name");
const cpfCnpjInput = document.getElementById("cpfCnpj");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const nameWarn = document.getElementById("name-warn");
const cpfCnpjWarn = document.getElementById("cpfCnpj-warn");
const phoneWarn = document.getElementById("phone-warn");
const addressWarn = document.getElementById("address-warn");
const emailWarn = document.getElementById("email-warn");
const checkoutStripeBtn = document.getElementById("checkout-stripe");
const checkoutAsaasBtn = document.getElementById("checkout-asaas")
const paymentModal = document.getElementById("payment-modal");
const cancelPaymentBtn = document.getElementById("cancel-payment-btn");

let cart = [];

// Abre o modal do carrinho ao clicar no botão
cartBtn.addEventListener("click", function() {
  updateCartModal();
  cartModal.style.display = "flex";
});

// Fecha o modal do carrinho ao clicar fora dele
cartModal.addEventListener("click", function(event) {
  if (event.target === cartModal) {
    cartModal.style.display = "none";
  }
});

// Fecha o modal do carrinho ao clicar no botão de fechar
closeModalBtn.addEventListener("click", function() {
  cartModal.style.display = "none";
});

// Adiciona itens ao carrinho quando o botão "Adicionar ao Carrinho" é clicado
menu.addEventListener("click", function(event) {
  let parentButton = event.target.closest(".add-to-cart-btn");

  if (parentButton) {
    const name = parentButton.getAttribute("data-name");
    const price = parseFloat(parentButton.getAttribute("data-price"));

    addToCart(name, price);
  }
});

// Função para adicionar itens ao carrinho
function addToCart(name, price) {
  const existingItem = cart.find(item => item.name === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      name,
      price,
      quantity: 1,
    });
  }

  updateCartModal();
}

// Atualiza o modal do carrinho com os itens e o total
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

// Função para remover itens do carrinho
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

// Valida o campo de endereço ao digitar
function addInputListener(input, warn) {
    input.addEventListener("input", function (event) {
        const value = event.target.value.trim();
        if (value !== "") {
            input.classList.remove("border-red-500");
            warn.classList.add("hidden");
        }
    });
}

// Aplicando escuta em todos os campos
addInputListener(nameInput, nameWarn);
addInputListener(cpfCnpjInput, cpfCnpjWarn);
addInputListener(phoneInput, phoneWarn);
addInputListener(addressInput, addressWarn);
addInputListener(emailInput, emailWarn);

// Função para finalizar o pedido
checkoutBtn.addEventListener("click", function () {
    let valid = true;

    // Verificações de preenchimento
    if (nameInput.value.trim() === "") {
        nameWarn.classList.remove("hidden");
        nameInput.classList.add("border-red-500");
        valid = false;
    }

    if (cpfCnpjInput.value.trim() === "") {
        cpfCnpjWarn.classList.remove("hidden");
        cpfCnpjInput.classList.add("border-red-500");
        valid = false;
    }

    if (phoneInput.value.trim() === "") {
        phoneWarn.classList.remove("hidden");
        phoneInput.classList.add("border-red-500");
        valid = false;
    }

    if (addressInput.value.trim() === "") {
        addressWarn.classList.remove("hidden");
        addressInput.classList.add("border-red-500");
        valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
        emailWarn.classList.remove("hidden");
        emailInput.classList.add("border-red-500");
        valid = false;
    }

    if (!valid || cart.length === 0) return;

});

    // Atualiza o modal do carrinho e abre o modal de pagamento
    cartModal.style.display = "none"; // Fecha o modal do carrinho
    paymentModal.style.display = "flex"; // Abre o modal de pagamento
});

// Fecha o modal de pagamento ao clicar em "Cancelar pagamento"
cancelPaymentBtn.addEventListener("click", function() {
  paymentModal.style.display = "none";
});                                         

// Processa o pagamento com Stripe
checkoutStripeBtn.addEventListener("click", async function () {
  if (cart.length === 0) return;

  try {
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))
      })
    });

    const session = await response.json();

    if (session.id) {
      const stripe = Stripe("pk_live_51RLWZiDCgQUWVX4YKX1JwdhjHT8fJ74CXCereV5tdWRFRiwOUzYKJPVJhpouBrtZmOpAxbINCI9QqUaRIpgtCjX600zNEKPFNi"); // Substitua pela sua chave pública real
      stripe.redirectToCheckout({ sessionId: session.id });
    } else {
      throw new Error("Falha ao obter a sessão do Stripe.");
    }

  } catch (error) {
    console.error("Erro no pagamento Stripe:", error);
    alert("Ocorreu um erro ao tentar processar o pagamento.");
  }
});
// Processa o pagamento com Asaas
/*checkoutAsaasBtn.addEventListener("click", async function () {
  if (cart.length === 0) return;

  const email = document.getElementById("email").value;
  if (!email || !email.includes("@")) {
    document.getElementById("email-warn").classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("/api/create-asaas-pix-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        email: email
      })
    });

    // Verifique se a resposta foi bem-sucedida antes de tentar processá-la
    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
    }

    const checkoutData = await response.json();

    if (checkoutData.checkoutUrl) {
      window.location.href = checkoutData.checkoutUrl;
    } else {
      throw new Error("Falha ao obter URL do checkout PIX.");
    }

  } catch (error) {
    console.error("Erro no checkout PIX:", error);

    // Exibe uma mensagem mais clara ao usuário
    alert(`Ocorreu um erro ao tentar processar o pagamento PIX. Detalhes: ${error.message}`);
  }
}); */

// Evento de clique no botão de checkout PIX
checkoutAsaasBtn.addEventListener("click", async function () {
  // Verifica se o carrinho está vazio
  if (cart.length === 0) return;

  const email = document.getElementById("email").value;

  // Valida o e-mail fornecido
  if (!email || !email.includes("@")) {
    document.getElementById("email-warn").classList.remove("hidden");
    return;
  }

  try {
    // Envia os dados para o back-end para criar o checkout PIX
    const response = await fetch("/api/create-asaas-pix-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        email: email
      })
    });

    // Verifica se a resposta foi bem-sucedida
    if (!response.ok) {
      throw new Error(`Erro do servidor: ${response.status} ${response.statusText}`);
    }

    const checkoutData = await response.json();

    // Verifica se a URL do checkout foi retornada
    if (checkoutData.checkoutUrl) {
      // Redireciona o usuário para o checkout PIX
      window.location.href = checkoutData.checkoutUrl;
    } else {
      throw new Error("Falha ao obter URL do checkout PIX.");
    }

  } catch (error) {
    console.error("Erro no checkout PIX:", error);

    // Exibe uma mensagem mais clara ao usuário em caso de erro
    alert(`Ocorreu um erro ao tentar processar o pagamento PIX. Detalhes: ${error.message}`);
  }
});
