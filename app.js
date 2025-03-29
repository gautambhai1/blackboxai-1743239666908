// Auth Modal Elements
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

// Toggle between login/signup forms
showSignup.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showLogin.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// Close modal
closeAuthModal.addEventListener('click', () => {
  authModal.classList.add('hidden');
});

// Show modal (will be called from other parts of the app)
function showAuthModal() {
  authModal.classList.remove('hidden');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
}

// Handle login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      authModal.classList.add('hidden');
      alert('Login successful!');
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Handle signup
signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Save additional user data
      const userData = {
        name: name,
        email: email,
        role: 'customer', // Default role
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Check for admin registration
      if (email.endsWith('@manojgroceries.admin')) {
        userData.role = 'admin';
        userData.permissions = ['manage_products', 'manage_orders', 'manage_users'];
      }
      
      return db.collection('users').doc(userCredential.user.uid).set(userData);
    })
    .then(() => {
      authModal.classList.add('hidden');
      alert('Account created successfully!');
    })
    .catch((error) => {
      alert(error.message);
    });
});

// Auth state observer
auth.onAuthStateChanged((user) => {
  const loginBtn = document.getElementById('loginBtn');
  if (user) {
    loginBtn.innerHTML = `<i class="fas fa-user mr-2"></i>${user.email}`;
  } else {
    loginBtn.innerHTML = '<i class="fas fa-user mr-2"></i>Login/Signup';
  }
});

// Initialize Firebase (temporary - will move to separate config file)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "manoj-grocery-shop.firebaseapp.com",
  projectId: "manoj-grocery-shop",
  storageBucket: "manoj-grocery-shop.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    const groceryInput = document.getElementById('groceryInput');
    const addBtn = document.getElementById('addBtn');
    const groceryList = document.getElementById('groceryList');
    let items = JSON.parse(localStorage.getItem('groceryItems')) || [];

    // Render existing items from localStorage
    renderItems();

    // Add new item
    addBtn.addEventListener('click', addItem);
    groceryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    function addItem() {
        const itemText = groceryInput.value.trim();
        if (itemText) {
            const newItem = {
                id: Date.now(),
                text: itemText,
                completed: false
            };
            items.push(newItem);
            saveItems();
            renderItems();
            groceryInput.value = '';
            groceryInput.focus();
        }
    }

    function renderItems() {
        groceryList.innerHTML = items.map(item => `
            <li class="py-3 px-4 flex items-center justify-between" data-id="${item.id}">
                <div class="flex items-center">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} 
                        class="mr-3 h-5 w-5 text-green-500 rounded focus:ring-green-500">
                    <span class="${item.completed ? 'completed' : ''}">${item.text}</span>
                </div>
                <button class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </li>
        `).join('');

        // Add event listeners for checkboxes and delete buttons
        document.querySelectorAll('#groceryList input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', toggleComplete);
        });

        document.querySelectorAll('#groceryList button').forEach(button => {
            button.addEventListener('click', deleteItem);
        });
    }

    function toggleComplete(e) {
        const itemId = parseInt(e.target.closest('li').dataset.id);
        const item = items.find(item => item.id === itemId);
        item.completed = e.target.checked;
        saveItems();
        renderItems();
    }

    function deleteItem(e) {
        const itemId = parseInt(e.target.closest('li').dataset.id);
        items = items.filter(item => item.id !== itemId);
        saveItems();
        renderItems();
    }

    function saveItems() {
        localStorage.setItem('groceryItems', JSON.stringify(items));
    }

    // Location functionality
    const locationInput = document.getElementById('locationInput');
    const locationBtn = document.getElementById('locationBtn');

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    // In a real app, you would reverse geocode these coordinates
                    locationInput.value = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                },
                (error) => {
                    console.error('Error getting location:', error);
                    locationInput.value = 'Unable to get location';
                }
            );
        } else {
            locationInput.value = 'Geolocation not supported';
        }
    });

    // Scratch Coupon functionality
    const couponInput = document.getElementById('couponInput');
    const applyCouponBtn = document.getElementById('applyCouponBtn');
    const couponMessage = document.getElementById('couponMessage');
    const discountAmount = 2; // Discount amount in rupees

    applyCouponBtn.addEventListener('click', () => {
        const couponCode = couponInput.value.trim();
        if (couponCode === 'SCRATCH2') {
            couponMessage.textContent = `Coupon applied! You saved ₹${discountAmount}.`;
            // Here you would update the total price logic accordingly
            // For example: totalPrice -= discountAmount;
        } else {
            couponMessage.textContent = 'Invalid coupon code. Please try again.';
        }
    });

// Card Type Detection
const detectCardType = (number) => {
  const patterns = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3(?:0[0-5]|6|8|9)/,
    jcb: /^(?:2131|1800|35)/
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(number)) return type;
  }
  return 'unknown';
};

// Format Card Number
const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = matches && matches[0] || '';
  const parts = [];
  
  for (let i = 0; i < match.length; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  
  return parts.length ? parts.join(' ') : value;
};

// Expiry date formatting
document.getElementById('cardExpiry').addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4);
  }
  e.target.value = value;
});

// Card number formatting and type display
document.getElementById('cardNumber').addEventListener('input', (e) => {
  e.target.value = formatCardNumber(e.target.value);
  const cardNumber = e.target.value.replace(/\s/g, '');
  const cardType = detectCardType(cardNumber);
  
  // Highlight active card icon
  document.querySelectorAll('#cardIcons i').forEach(icon => {
    icon.classList.remove('text-blue-500', 'text-gray-400');
    icon.classList.add('text-gray-400');
  });
  
  if (cardType !== 'unknown') {
    const activeIcon = document.getElementById(`${cardType}Icon`);
    if (activeIcon) {
      activeIcon.classList.remove('text-gray-400');
      activeIcon.classList.add('text-blue-500');
    }
  }
});

// Order Processing Functions
function calculateCartTotal() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;
  
  document.getElementById('cartSubtotal').textContent = `₹${subtotal}`;
  document.getElementById('cartTotal').textContent = `₹${total}`;
}

// Initialize cart totals
if (document.getElementById('cartSubtotal')) {
  calculateCartTotal();
}

// Handle order submission
document.getElementById('checkoutForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const orderData = {
    customer: {
      name: document.getElementById('customerName').value,
      phone: document.getElementById('customerPhone').value,
      address: document.getElementById('deliveryAddress').value
    },
    payment: {
      method: document.querySelector('input[name="paymentMethod"]:checked').value,
      status: 'pending'
    },
    items: cart,
    subtotal: parseFloat(document.getElementById('cartSubtotal').textContent.replace('₹', '')),
    delivery: 50,
    total: parseFloat(document.getElementById('cartTotal').textContent.replace('₹', '')),
    status: 'processing',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Check network status
  if (!navigator.onLine) {
    // Store order locally for later sync
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders')) || [];
    orderData.status = 'pending (offline)';
    pendingOrders.push(orderData);
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    
    // Clear cart and show offline confirmation
    localStorage.removeItem('cart');
    updateCartCount();
    window.location.href = 'order-confirmation.html?offline=true';
    return;
  }

  try {
    // Save order to Firestore
    const docRef = await db.collection('orders').add(orderData);
    
    // Clear cart and redirect
    localStorage.removeItem('cart');
    updateCartCount();
    window.location.href = `order-confirmation.html?orderId=${docRef.id}`;
    
  } catch (error) {
    console.error('Order submission error:', error);
    // Fallback to offline storage
    const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders')) || [];
    orderData.status = 'pending (error)';
    pendingOrders.push(orderData);
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    
    // Still clear cart and show confirmation
    localStorage.removeItem('cart');
    updateCartCount();
    window.location.href = 'order-confirmation.html?offline=true';
  }
});

// Sync pending orders when online
function syncPendingOrders() {
  const pendingOrders = JSON.parse(localStorage.getItem('pendingOrders')) || [];
  if (pendingOrders.length === 0) return;

  const batch = db.batch();
  const ordersRef = db.collection('orders');
  
  pendingOrders.forEach(order => {
    const newOrderRef = ordersRef.doc();
    batch.set(newOrderRef, {
      ...order,
      status: 'processing',
      syncedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });

  return batch.commit()
    .then(() => {
      localStorage.removeItem('pendingOrders');
      console.log('Successfully synced pending orders');
    })
    .catch(error => {
      console.error('Error syncing orders:', error);
    });
}

// Check for pending orders on load and when coming online
window.addEventListener('online', syncPendingOrders);
document.addEventListener('DOMContentLoaded', syncPendingOrders);

// Card Payment Elements
const cardPaymentModal = document.getElementById('cardPaymentModal');
const closeCardModal = document.getElementById('closeCardModal');
const cardPaymentForm = document.getElementById('cardPaymentForm');

// Show card payment form
function showCardPaymentForm() {
  cardPaymentForm.reset();
  cardPaymentModal.classList.remove('hidden');
}

// Close card modal
closeCardModal.addEventListener('click', () => {
  cardPaymentModal.classList.add('hidden');
});

// Handle card payment
cardPaymentForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const cardData = {
    number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
    expiry: document.getElementById('cardExpiry').value,
    cvv: document.getElementById('cardCvv').value,
    name: document.getElementById('cardName').value
  };

  // Basic validation
  if (!/^\d{16}$/.test(cardData.number)) {
    alert('Please enter a valid 16-digit card number');
    return;
  }

  if (!/^\d{3,4}$/.test(cardData.cvv)) {
    alert('Please enter a valid CVV');
    return;
  }

  // In a real app, you would integrate with payment gateway APIs here
  alert(`Card payment processed successfully!\nLast 4 digits: ${cardData.number.slice(-4)}`);
  cardPaymentModal.classList.add('hidden');
  // Proceed with order completion
});

// Product sorting functionality
if (document.getElementById('sortOptions')) {
  const sortOptions = document.getElementById('sortOptions');
  sortOptions.addEventListener('change', (e) => {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    const products = Array.from(productsGrid.children);
    
    products.sort((a, b) => {
      const priceA = parseFloat(a.querySelector('[data-price]').dataset.price);
      const priceB = parseFloat(b.querySelector('[data-price]').dataset.price);
      const nameA = a.querySelector('h3').textContent.toLowerCase();
      const nameB = b.querySelector('h3').textContent.toLowerCase();
      const ratingA = parseFloat(a.querySelector('.add-to-cart').dataset.rating) || 0;
      const ratingB = parseFloat(b.querySelector('.add-to-cart').dataset.rating) || 0;
      const reviewsA = parseInt(a.querySelector('.add-to-cart').dataset.reviews) || 0;
      const reviewsB = parseInt(b.querySelector('.add-to-cart').dataset.reviews) || 0;
      
      switch(e.target.value) {
        case 'price-low': return priceA - priceB;
        case 'price-high': return priceB - priceA;
        case 'name-asc': return nameA.localeCompare(nameB);
        case 'name-desc': return nameB.localeCompare(nameA);
        case 'rating-high': return ratingB - ratingA;
        case 'popular': return reviewsB - reviewsA;
        default: return 0;
      }
    });

    // Reattach sorted products
    products.forEach(product => productsGrid.appendChild(product));
  });
}

// Payment button handlers
    document.querySelectorAll('.bg-blue-100, .bg-purple-100, .bg-gray-100').forEach(button => {
        button.addEventListener('click', () => {
            const paymentMethod = button.textContent.trim();
            if (paymentMethod === 'Credit/Debit Card') {
                showCardPaymentForm();
            } else {
                alert(`Selected payment method: ${paymentMethod}`);
                // Process other payment methods
            }
        });
    });
});