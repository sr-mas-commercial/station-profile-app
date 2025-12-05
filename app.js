const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzltIvZnp4Kq_49UREknIZegUz5WGiCB3NUTMqsH2hxN_QhOy-EmXZMTzH6rZcw8klfVw/exec';

let currentUser = null;
let allFiles = [];
let filteredFiles = [];

document.addEventListener('DOMContentLoaded', function() {
  // Set present date
  const todayOption = document.getElementById('today-date');
  if (todayOption) {
    todayOption.textContent = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }
  
  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.addEventListener('click', login);
});

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  const btn = document.getElementById('login-btn');
  if (btn) btn.textContent = 'Logging in...';
  
  fetch(`${SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      if (result.status === 'success') {
        currentUser = { role: result.role, station: result.station || 'MAS' };
        showDashboard();
      } else {
        alert(result.message || 'Login failed');
      }
    })
    .catch(() => alert('Network error'))
    .finally(() => {
      if (btn) btn.textContent = 'Login';
    });
}

function showDashboard() {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('show'));
  
  if (currentUser.role === 'Officer') {
    document.getElementById('officer-dashboard').classList.add('show');
    loadRecentFiles();
  } else if (['MCDO', 'BDU'].includes(currentUser.role)) {
    document.getElementById('upload-section').classList.add('show');
    document.getElementById('user-role').textContent = currentUser.role;
  } else {
    document.getElementById('mpp-section').classList.add('show');
  }
}

function logout() {
  currentUser = null;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('show'));
  document.getElementById('login-section').classList.add('show');
}

function loadRecentFiles() {
  document.getElementById('files-list').innerHTML = 'Loading...';
  fetch(`${SCRIPT_URL}?action=files&role=Officer&full=true`)
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      allFiles = result.files || [];
      filteredFiles = allFiles;
      applyFilters();
    })
    .catch(() => {
      document.getElementById('files-list').innerHTML = 'Error loading files';
    });
}

function applyFilters() {
  filteredFiles = allFiles.filter(file => {
    const fileDate = new Date(file[0]);
    return true; // Simplified for now
  });
  displayFiles(filteredFiles);
}

function displayFiles(files) {
  const list = document.getElementById('files-list');
  if (files.length === 0) {
    list.innerHTML = '<p>No files</p>';
    return;
  }
  list.innerHTML = files.map(f => `<div>${f[4]} - ${f[1]}</div>`).join('');
}

function previewFile() {
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('preview');
  const uploadBtn = document.getElementById('upload-btn');
  
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      preview.innerHTML = file.type.startsWith('image/') ? 
        `<img src="${e.target.result}" style="max-width:100%;">` :
        `<div>${file.name} (${(file.size/1024).toFixed(1)}KB)</div>`;
      uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
}

function uploadFile() {
  const fileInput = document.getElementById('file-input');
  const periodSelect = document.getElementById('period');
  const uploadBtn = document.getElementById('upload-btn');
  
  const file = fileInput.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('role', currentUser.role);
    formData.append('period', periodSelect.value);
    formData.append('uploader', `${currentUser.station}-${currentUser.role}`);
    formData.append('fileName', file.name);
    formData.append('fileType', file.type);
    formData.append('fileData', e.target.result);
    
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    fetch(SCRIPT_URL, { method: 'POST', body: formData })
      .then(r => r.text())
      .then(text => {
        const result = JSON.parse(text);
        if (result.status === 'success') {
          alert('Upload success!');
          fileInput.value = '';
          document.getElementById('preview').innerHTML = '';
          if (currentUser.role === 'Officer') loadRecentFiles();
        }
      })
      .finally(() => {
        uploadBtn.textContent = 'Upload File';
        uploadBtn.disabled = false;
      });
  };
  reader.readAsDataURL(file);
}
