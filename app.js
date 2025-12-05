const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzltIvZnp4Kq_49UREknIZegUz5WGiCB3NUTMqsH2hxN_QhOy-EmXZMTzH6rZcw8klfVw/exec';
// AUTO SET "PRESENT DATE" (runs when page loads)
document.addEventListener('DOMContentLoaded', function() {
  const todayOption = document.getElementById('today-date');
  if (todayOption) {
    const today = new Date().toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    todayOption.textContent = today; // Shows "5 Dec 2025"
  }
});
let currentUser = null;

function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  if (loginBtn) loginBtn.textContent = 'Logging in...';
  
  fetch(`${SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    .then(r => r.text())
    .then(text => {
      try {
        const result = JSON.parse(text);
        console.log('Login response:', result); // Debug
        if (result.status === 'success') {
          currentUser = {
            role: result.role,
            station: result.station
          };
          showDashboard();
        } else {
          alert(result.message || 'Login failed');
        }
      } catch (e) {
        console.error('Parse error:', text);
        alert('Login error: Invalid response');
      }
    })
    .catch(err => {
      console.error('Network error:', err);
      alert('Network error: Cannot reach server');
    })
    .finally(() => {
      if (loginBtn) loginBtn.textContent = 'Login';
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
  } else if (currentUser.role === 'MPP') {
    document.getElementById('mpp-section').classList.add('show');
  }
}

function logout() {
  currentUser = null;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('show'));
  document.getElementById('login-section').classList.add('show');
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
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
  const uploadBtn = document.getElementById('upload-btn');
  
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
    
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
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
          loadRecentFiles();
        }
      } else {
        alert('Upload failed: ' + (result.message || 'Unknown error'));
      }
    })
    .catch(err => alert('Upload error: ' + err.message))
    .finally(() => {
      uploadBtn.textContent = 'Upload File';
      uploadBtn.disabled = false;
    });
  };
  reader.readAsDataURL(file);
}

// Filter variables
let allFiles = [];
let filteredFiles = [];

function loadRecentFiles() {
  const filesList = document.getElementById('files-list');
  filesList.innerHTML = 'Loading...';
  
  fetch(`${SCRIPT_URL}?action=files&role=Officer&full=true`)
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      allFiles = result.files;
      filteredFiles = allFiles;
      applyFilters();
    })
    .catch(err => {
      filesList.innerHTML = 'Error loading files';
      console.error('Files error:', err);
    });
}

function applyFilters() {
  const fromDate = document.getElementById('from-date').value;
  const toDate = document.getElementById('to-date').value;
  const monthFilter = document.getElementById('month-filter').value;
  const fyFilter = document.getElementById('fy-filter').value;
  const roleFilter = document.getElementById('role-filter').value;
  
  filteredFiles = allFiles.filter(file => {
    const fileDate = new Date(file[0]);
    const fileMonth = fileDate.toLocaleDateString('en-IN', { month: 'short' });
    const fileFY = getFinancialYear(fileDate);
    
    // Date range filter
    if (fromDate && fileDate < new Date(fromDate)) return false;
    if (toDate && fileDate > new Date(toDate)) return false;
    
    // Month filter
    if (monthFilter && fileMonth !== monthFilter) return false;
    
    // FY filter
    if (fyFilter && fileFY !== fyFilter) return false;
    
    // Role filter
    if (roleFilter !== 'Officer' && file[1] !== roleFilter) return false;
    
    return true;
  });
  
  displayFiles(filteredFiles);
  document.getElementById('filter-count').textContent = 
    `${filteredFiles.length} files found`;
}

function getFinancialYear(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return month >= 4 ? `${year-1}-${year.toString().slice(-2)}` : `${year-2}-${year-1.toString().slice(-2)}`;
}

function displayFiles(files) {
  const filesList = document.getElementById('files-list');
  
  if (files.length === 0) {
    filesList.innerHTML = '<p style="text-align:center; color:#666;">No files match the selected filters.</p>';
    return;
  }
  
  filesList.innerHTML = files.map(file => {
    const fileDate = new Date(file[0]);
    const fileMonth = fileDate.toLocaleDateString('en-IN', { month: 'short' });
    const fileFY = getFinancialYear(fileDate);
    
    return `
      <div class="file-item">
        <div class="file-header">
          ${file[2]} - ${file[1]} (${file[3]}) | ${fileMonth} | FY ${fileFY}
        </div>
        <div><a href="${file[5]}" target="_blank">${file[4]}</a></div>
        <div>${fileDate.toLocaleString('en-IN')} | ${file[6]} KB</div>
      </div>
    `;
  }).join('');
}

function downloadFilteredCSV() {
  if (filteredFiles.length === 0) {
    alert('No files to download');
    return;
  }
  
  let csv = 'Timestamp,Role,Period,Uploader,FileName,DriveLink,SizeKB\n';
  filteredFiles.forEach(file => {
    csv += `${new Date(file[0]).toLocaleString('en-IN')},"${file[1]}","${file[2]}","${file[3]}","${file[4]}",${file[5]},${file[6]}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Station-Files-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

function loadRecentFiles() {
  const filesList = document.getElementById('files-list');
  filesList.innerHTML = 'Loading...';
  
  fetch(`${SCRIPT_URL}?action=files&role=Officer`)
    .then(r => r.text())
    .then(text => {
      const result = JSON.parse(text);
      if (result.files.length === 0) {
        filesList.innerHTML = '<p>No files uploaded yet.</p>';
        return;
      }
      
      filesList.innerHTML = result.files.map(file => `
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
      filesList.innerHTML = 'Error loading files';
      console.error('Files error:', err);
    });
}
