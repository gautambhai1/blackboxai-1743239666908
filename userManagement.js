// Admin Permissions
const ADMIN_PERMISSIONS = [
  'manage_products',
  'manage_orders', 
  'manage_users',
  'view_reports'
];

const MANAGER_PERMISSIONS = [
  'manage_products',
  'manage_orders',
  'view_reports'
];

// User Management Functions
const loadUsers = () => {
  const tableBody = document.getElementById('usersTableBody');
  tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Loading users...</td></tr>';
  
  db.collection('users').get().then(snapshot => {
    tableBody.innerHTML = '';
    
    if (snapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No users found</td></tr>';
      return;
    }

    snapshot.forEach(doc => {
      const user = doc.data();
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${user.name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <select class="user-role border rounded p-1" data-uid="${doc.id}">
            <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
            <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>Manager</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="save-user text-blue-500 hover:text-blue-700" data-uid="${doc.id}">
            <i class="fas fa-save"></i> Save
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  });
};

// Handle role changes
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('user-role')) {
    const userId = e.target.dataset.uid;
    const newRole = e.target.value;
    
    db.collection('users').doc(userId).update({
      role: newRole
    }).then(() => {
      alert('User role updated successfully!');
    });
  }
});

// Permissions Modal Elements
const permissionsModal = document.getElementById('permissionsModal');
const closePermissionsModal = document.getElementById('closePermissionsModal');
const savePermissionsBtn = document.getElementById('savePermissions');
const permissionsList = document.getElementById('permissionsList');
let currentEditingUser = null;

// Handle permissions button click
document.addEventListener('click', (e) => {
  if (e.target.closest('.edit-permissions')) {
    currentEditingUser = e.target.closest('.edit-permissions').dataset.uid;
    openPermissionsModal(currentEditingUser);
  }
});

// Open permissions modal
const openPermissionsModal = async (userId) => {
  permissionsList.innerHTML = '<p>Loading permissions...</p>';
  permissionsModal.classList.remove('hidden');
  
  const userDoc = await db.collection('users').doc(userId).get();
  const user = userDoc.data();
  
  // Create permission checkboxes
  permissionsList.innerHTML = '';
  const allPermissions = [...new Set([...ADMIN_PERMISSIONS, ...MANAGER_PERMISSIONS])];
  
  allPermissions.forEach(permission => {
    const div = document.createElement('div');
    div.className = 'flex items-center';
    div.innerHTML = `
      <input type="checkbox" id="perm-${permission}" value="${permission}" 
        ${user.permissions?.includes(permission) ? 'checked' : ''}
        class="mr-2 rounded text-green-500">
      <label for="perm-${permission}">${permission.replace('_', ' ')}</label>
    `;
    permissionsList.appendChild(div);
  });
};

// Save permissions
savePermissionsBtn.addEventListener('click', () => {
  if (!currentEditingUser) return;
  
  const checkboxes = permissionsList.querySelectorAll('input[type="checkbox"]');
  const selectedPermissions = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
    
  db.collection('users').doc(currentEditingUser).update({
    permissions: selectedPermissions
  }).then(() => {
    alert('Permissions updated successfully!');
    permissionsModal.classList.add('hidden');
    loadUsers();
  });
});

// Close permissions modal
closePermissionsModal.addEventListener('click', () => {
  permissionsModal.classList.add('hidden');
});

export { loadUsers, openPermissionsModal };
