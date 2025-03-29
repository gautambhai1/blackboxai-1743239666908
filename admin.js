// Validation functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^\+?[0-9]{10,15}$/.test(phone);
}

// Initialize Firebase with same config as main app
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

// Staff Login Functionality
if (document.getElementById('staffLoginForm')) {
  // Security configuration
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 5 * 60 * 1000;
  let failedAttempts = 0;
  let lastAttemptTime = 0;
  let recaptchaWidget;

  // Load reCAPTCHA
  function loadRecaptcha() {
    recaptchaWidget = grecaptcha.render('recaptcha-container', {
      sitekey: 'YOUR_RECAPTCHA_SITE_KEY',
      theme: 'light'
    });
  }

  // Password validation
  function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  }

  // Initialize security features
  document.addEventListener('DOMContentLoaded', () => {
    // Load reCAPTCHA script
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    window.onRecaptchaLoad = loadRecaptcha;
  });

  document.getElementById('staffLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('staffEmail').value;
    const password = document.getElementById('staffPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const currentTime = Date.now();
    
    // Check if account is temporarily locked
    if (failedAttempts >= MAX_ATTEMPTS && 
        (currentTime - lastAttemptTime) < LOCKOUT_TIME) {
      const remainingTime = Math.ceil((LOCKOUT_TIME - (currentTime - lastAttemptTime)) / 60000);
      alert(`Account temporarily locked. Try again in ${remainingTime} minutes.`);
      return;
    }
    
    try {
      // Set persistence based on remember me
      const persistence = rememberMe ? 
        firebase.auth.Auth.Persistence.LOCAL : 
        firebase.auth.Auth.Persistence.SESSION;
      
      await auth.setPersistence(persistence);
      
      // Authenticate with Firebase
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      // Check if user is admin
      const user = userCredential.user;
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists && userDoc.data().isAdmin) {
        window.location.href = 'admin.html';
      } else {
        await auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      failedAttempts++;
      lastAttemptTime = Date.now();
      
      if (failedAttempts >= MAX_ATTEMPTS) {
        alert(`Too many failed attempts. Account locked for 5 minutes.`);
        // Send lockout notification
        try {
          const ip = await fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => data.ip);
            
          const alertData = {
            type: 'account_lockout',
            email: email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ip: ip
          };
          
          // Log to security logs
          await db.collection('security_logs').add(alertData);
          
          // Send email notification
          await db.collection('mail').add({
            to: 'admin@manojgroceries.com',
            message: {
              subject: 'Account Lockout Alert',
              text: `Account lockout detected:
                     \nEmail: ${email}
                     \nIP: ${ip}
                     \nTime: ${new Date().toLocaleString()}`
            }
          });

          // Send SMS notification
          await db.collection('sms_messages').add({
            to: '+911234567890', // Admin phone number
            message: `ALERT: Account lockout for ${email} from IP ${ip}`
          });
        } catch (logError) {
          console.error('Failed to log lockout:', logError);
        }
      } else {
        alert(`${error.message || 'Login failed'} (${MAX_ATTEMPTS - failedAttempts} attempts remaining)`);
      }
    }
  });
}

// Admin auth check
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'staff-login.html';
  } else {
    // Verify admin role
    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (!doc.exists || !doc.data().isAdmin) {
          auth.signOut();
          window.location.href = 'staff-login.html';
        } else {
          // Load admin data
          loadAdminStats();
        }
      });
  }
});

function loadSecurityAlerts() {
  const tableBody = document.getElementById('securityAlertsTableBody');
  tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading security alerts...</td></tr>';
  
  const typeFilter = document.getElementById('alertTypeFilter').value;
  const dateFilter = document.getElementById('alertDateFilter').value;
  
  let query = db.collection('security_logs').orderBy('timestamp', 'desc');
  
  if (typeFilter) {
    query = query.where('type', '==', typeFilter);
  }
  
  if (dateFilter) {
    const startDate = new Date(dateFilter);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    
    query = query.where('timestamp', '>=', startDate)
                .where('timestamp', '<', endDate);
  }
  
  query.limit(50).get()
    .then(snapshot => {
      tableBody.innerHTML = '';
      
      if (snapshot.empty) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No security alerts found</td></tr>';
        return;
      }

      snapshot.forEach(doc => {
        const alert = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap">${alert.type}</td>
          <td class="px-6 py-4 whitespace-nowrap">${alert.email || 'N/A'}</td>
          <td class="px-6 py-4 whitespace-nowrap">${alert.ip || 'N/A'}</td>
          <td class="px-6 py-4 whitespace-nowrap">${new Date(alert.timestamp?.toDate()).toLocaleString()}</td>
        `;
        tableBody.appendChild(row);
      });
    });
}
function loadAdminStats() {
  // Get order count
  db.collection('orders').get().then(snapshot => {
    document.querySelector('.bg-blue-50 .text-2xl').textContent = snapshot.size;
  });

  // Get product count
  db.collection('products').get().then(snapshot => {
    document.querySelector('.bg-green-50 .text-2xl').textContent = snapshot.size;
  });

  // Get customer count
  db.collection('users').where('isAdmin', '==', false).get().then(snapshot => {
    document.querySelector('.bg-yellow-50 .text-2xl').textContent = snapshot.size;
  });

  // Get security alerts
  db.collection('security_logs')
    .orderBy('timestamp', 'desc')
    .limit(5)
    .get()
    .then(snapshot => {
      const alertCount = document.getElementById('securityAlertsCount');
      if (alertCount) {
        alertCount.textContent = snapshot.size;
        
        // Log recent alerts to console
        snapshot.forEach(doc => {
          const alert = doc.data();
          console.log(`[SECURITY ALERT] ${alert.type} - ${alert.email} - ${new Date(alert.timestamp?.toDate()).toLocaleString()}`);
        });
      }
    });
}

// Tab switching functionality
document.querySelectorAll('nav a').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tabId = `${e.target.textContent.toLowerCase()}Tab`;
    document.querySelectorAll('[id$="Tab"]').forEach(tab => {
      tab.classList.add('hidden');
    });
    document.getElementById(tabId).classList.remove('hidden');
    
    // Load data when switching tabs
  if (tabId === 'productsTab') {
    loadProducts();
  } else if (tabId === 'ordersTab') {
    loadOrders();
  }
  });
});

// Load products into table
function loadProducts() {
  const tableBody = document.getElementById('productsTableBody');
  tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Loading products...</td></tr>';
  
  db.collection('products').get().then(snapshot => {
    tableBody.innerHTML = '';
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No products found</td></tr>';
      return;
    }

    snapshot.forEach(doc => {
      const product = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${product.name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${product.category}</td>
        <td class="px-6 py-4 whitespace-nowrap">₹${product.price}</td>
        <td class="px-6 py-4 whitespace-nowrap">${product.stock}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="edit-product text-blue-500 hover:text-blue-700 mr-2" data-id="${doc.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-product text-red-500 hover:text-red-700" data-id="${doc.id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  });
}

// Handle order status updates
document.addEventListener('click', (e) => {
  if (e.target.closest('.update-status')) {
    const orderId = e.target.closest('.update-status').dataset.id;
    const newStatus = prompt('Update order status:\n(Processing, Shipped, Completed, Cancelled)');
    
    if (newStatus && ['Processing', 'Shipped', 'Completed', 'Cancelled'].includes(newStatus)) {
      db.collection('orders').doc(orderId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        loadOrders();
      });
    } else if (newStatus) {
      alert('Invalid status. Please use: Processing, Shipped, Completed, or Cancelled');
    }
  }
});

// Add product button
document.getElementById('addProductBtn').addEventListener('click', () => {
  // Will implement product add modal next
  alert('Add product functionality coming soon!');
});

// Export security alerts
document.getElementById('exportAlerts').addEventListener('click', async () => {
  try {
    const typeFilter = document.getElementById('alertTypeFilter').value;
    const dateFilter = document.getElementById('alertDateFilter').value;
    
    let query = db.collection('security_logs').orderBy('timestamp', 'desc');
    
    if (typeFilter) {
      query = query.where('type', '==', typeFilter);
    }
    
    if (dateFilter) {
      const startDate = new Date(dateFilter);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query.where('timestamp', '>=', startDate)
                  .where('timestamp', '<', endDate);
    }
    
    const alerts = await query.limit(1000).get();
    
    const csvContent = [
      ['Type', 'Email', 'IP', 'Timestamp'],
      ...alerts.docs.map(doc => {
        const alert = doc.data();
        return [
          `"${alert.type}"`,
          `"${alert.email || 'N/A'}"`,
          `"${alert.ip || 'N/A'}"`,
          `"${new Date(alert.timestamp?.toDate()).toLocaleString()}"`
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `security_alerts_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to export security alerts. Please try again.');
  }
});

// Save notification settings
document.getElementById('saveSettings').addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value;
  const phone = document.getElementById('adminPhone').value;
  const emailEnabled = document.getElementById('emailAlerts').checked;
  const smsEnabled = document.getElementById('smsAlerts').checked;

  // Validate inputs
  if (emailEnabled && email && !isValidEmail(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  if (smsEnabled && phone && !isValidPhone(phone)) {
    alert('Please enter a valid phone number (10-15 digits, + optional)');
    return;
  }

  try {
    await db.collection('admin_settings').doc('notifications').set({
      emailEnabled: emailEnabled,
      smsEnabled: smsEnabled,
      adminEmail: email,
      adminPhone: phone,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings. Please try again.');
  }
});

// Real-time validation feedback
document.getElementById('adminEmail').addEventListener('input', (e) => {
  const email = e.target.value;
  if (email && !isValidEmail(email)) {
    e.target.classList.add('border-red-500');
  } else {
    e.target.classList.remove('border-red-500');
  }
});

document.getElementById('adminPhone').addEventListener('input', (e) => {
  const phone = e.target.value;
  if (phone && !isValidPhone(phone)) {
    e.target.classList.add('border-red-500');
  } else {
    e.target.classList.remove('border-red-500');
  }
});

// Load notification settings
async function loadSettings() {
  try {
    const doc = await db.collection('admin_settings').doc('notifications').get();
    if (doc.exists) {
      const settings = doc.data();
      document.getElementById('emailAlerts').checked = settings.emailEnabled;
      document.getElementById('smsAlerts').checked = settings.smsEnabled;
      document.getElementById('adminEmail').value = settings.adminEmail || '';
      document.getElementById('adminPhone').value = settings.adminPhone || '';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
});