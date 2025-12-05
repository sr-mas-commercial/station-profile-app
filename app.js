const SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEBAPP_URL_HERE'; // Paste your Apps Script URL
let currentUser = null;

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  document.getElementById('login-btn').textContent = 'Logging in...';
  
  fetch(`${SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    .then(r => r.text())
    .then(text => {
      try {
        const result = JSON.parse(text);
        if (result.status === 'success') {
          currentUser = {
            role: result.role,
            station: result.station
          };
          showDashboard();
        } else {
          alert(result.message);
        }
      } catch (e) {
        alert('Login error: ' + e.message);
      }
    })
    .catch(err => {
      alert('Network error: ' + err.message);
    })
    .finally(() => {
      document.getElementById('login-btn').textContent = 'Login';
    });
}

function showDashboard() {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('show'));
  
  if (currentUser.role === 'Officer') {
    document.getElementById('officer-dashboard').classList.add('show');
    loadRecentFiles();
  } else if (['MCDO', 'BDU'].includes(currentUser.role)) {
    document.getElementById('upload-section').classList.add('show');
    document.getElementById('user-role').textContent = currentUser.role;
  } else if (currentUser.role === 'MPP') {
    document.getElementById('mpp-section').classList.add('show');
  }
}

function previewFile() {
  const file = document.getElementById('file-input').files[0];
  const preview = document.getElementById('preview');
  const uploadBtn = document.getElementById('upload-btn');
  
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%; max-height:300px;">`;
      } else {
        preview.innerHTML = `
          <div style="padding:20px; border:2px dashed #ccc;">
            <strong>${file.name}</strong><br>
            Size: ${(file.size / 1024).toFixed(1)} KB<br>
            Type: ${file.type}
          </div>
        `;
      }
      uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }
}

function uploadFile() {
  const file = document.getElementById('file-input').files[0];
  const period = document.getElementById('period').value;
  
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('role', currentUser.role);
    formData.append('period', period);
    formData.append('uploader', `${currentUser.station} - ${currentUser.role}`);
    formData.append('fileName', file.name);
    formData.append('fileType', file.type);
    formData.append('fileData', e.target.result);
    
    document.getElementById('upload-btn').textContent = 'Uploading...';
    document.getElementById('upload-btn').disabled = true;
    
    fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    })
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      if (result.status === 'success') {
        alert(`✅ File uploaded!\nView: ${result.url}`);
        document.getElementById('file-input').value = '';
        document.getElementById('preview').innerHTML = '';
        if (currentUser.role === 'Officer') {
          loadRecentFiles(); // Refresh dashboard
        }
      } else {
        alert('Upload failed: ' + result.message);
      }
    })
    .catch(err => alert('Upload error: ' + err.message))
    .finally(() => {
      document.getElementById('upload-btn').textContent = 'Upload File';
      document.getElementById('upload-btn').disabled = false;
    });
  };
  reader.readAsDataURL(file);
}

function loadRecentFiles() {
  fetch(`${SCRIPT_URL}?action=files&role=Officer`)
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      const list = document.getElementById('files-list');
      
      if (result.files.length === 0) {
        list.innerHTML = '<p>No files uploaded yet.</p>';
        return;
      }
      
      list.innerHTML = result.files.map(file => `
        <div class="file-item">
          <div class="file-header">
            ${file[2]} - ${file[1]} (${file[3]})
          </div>
          <div><a href="${file[5]}" target="_blank">${file[4]}</a></div>
          <div>${new Date(file[0]).toLocaleString('en-IN')} | ${file[6]} KB</div>
        </div>
      `).join('');
    })
    .catch(err => {
      document.getElementById('files-list').innerHTML = 'Error loading files';
    });
}
