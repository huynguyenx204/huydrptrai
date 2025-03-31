// Kiểm tra trạng thái đăng ký và đăng nhập
function checkRegistrationAndLogin() {
    const token = localStorage.getItem("token");
    const justRegistered = localStorage.getItem("justRegistered");
    const currentPage = window.location.pathname.split("/").pop();

    if (!token && currentPage === "index.html") {
        setTimeout(() => {
            window.location.href = "register.html";
        }, 100);
        return;
    }

    if (justRegistered && currentPage === "register.html") {
        localStorage.removeItem("justRegistered");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 100);
        return;
    }

    if (token && (currentPage === "register.html" || currentPage === "login.html")) {
        setTimeout(() => {
            window.location.href = "index.html";
        }, 100);
    }
}

// Hiển thị/Ẩn mật khẩu
function togglePassword(inputId) {
    let passwordInput = document.getElementById(inputId);
    let toggleIcon = document.querySelector(`[onclick="togglePassword('${inputId}')"]`);

    if (!passwordInput || !toggleIcon) {
        console.error(`Không tìm thấy input hoặc biểu tượng với ID: ${inputId}`);
        return;
    }

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.textContent = "––";
    } else {
        passwordInput.type = "password";
        toggleIcon.textContent = "👁";
    }
}

// Hiển thị thông tin người dùng
function displayUserInfo() {
    const token = localStorage.getItem("token");
    const userInfo = document.getElementById("userInfo");

    if (!token) {
        console.error("Không tìm thấy token trong localStorage");
        if (userInfo) userInfo.textContent = "ID: N/A";
        return;
    }

    if (!userInfo) {
        console.error("Không tìm thấy phần tử userInfo trong DOM");
        return;
    }

    // Kiểm tra xem jwt_decode có được định nghĩa không
    if (typeof jwt_decode === "undefined") {
        console.error("jwt_decode không được định nghĩa. Đảm bảo file jwt-decode.min.js được tải đúng.");
        userInfo.textContent = "ID: N/A";
        return;
    }

    try {
        const decoded = jwt_decode(token);
        console.log("Decoded token:", decoded);
        if (!decoded.id) {
            console.error("Token không chứa trường id:", decoded);
            userInfo.textContent = "ID: N/A";
            return;
        }
        userInfo.textContent = `ID: ${decoded.id}`;
    } catch (err) {
        console.error('Lỗi giải mã token:', err);
        userInfo.textContent = "ID: N/A";
    }
}

// Đăng ký tài khoản
async function register() {
    let username = document.getElementById("registerUsername").value.trim();
    let password = document.getElementById("registerPassword").value.trim();
    let email = document.getElementById("registerEmail").value.trim();

    if (username === "" || password === "" || email === "") {
        showNotification("Vui lòng nhập đầy đủ thông tin!", "error");
        return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showNotification("Vui lòng nhập email hợp lệ!", "error");
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        const result = await response.json();
        showNotification(result.message, response.ok ? "success" : "error");
        if (response.ok) {
            localStorage.setItem("justRegistered", "true");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        }
    } catch (err) {
        console.error('Lỗi đăng ký:', err);
        showNotification("Lỗi: Không thể kết nối đến server!", "error");
    }
}

// Đăng nhập
async function login() {
    let username = document.getElementById("loginUsername").value.trim();
    let password = document.getElementById("loginPassword").value.trim();

    if (username === "" || password === "") {
        showNotification("Vui lòng nhập tên đăng nhập và mật khẩu!", "error");
        return;
    }

    try {
        const response = await fetch('http://localhost:4000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (response.ok) {
            localStorage.setItem("token", result.token);
            showNotification(`Đăng nhập thành công! ID Tài Khoản: ${result.userId}`, "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } else {
            showNotification(result.message || "Đăng nhập thất bại!", "error");
        }
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        showNotification("Lỗi: Không thể kết nối đến server!", "error");
    }
}

// Kiểm tra trạng thái đăng nhập
function checkLogin() {
    const token = localStorage.getItem("token");
    const currentPage = window.location.pathname.split("/").pop();

    if (!token && currentPage !== "login.html" && currentPage !== "register.html") {
        window.location.href = "login.html";
    }
}

// Đăng xuất
function logout() {
    localStorage.removeItem("token");
    showNotification("Bạn đã đăng xuất!", "success");
    setTimeout(() => {
        window.location.href = "login.html";
    }, 1000);
}

// Tải file lên
async function uploadFile() {
    let fileInput = document.getElementById("fileInput");

    if (!fileInput) {
        showNotification("Không tìm thấy trường nhập liệu. Vui lòng kiểm tra lại!", "error");
        return;
    }

    if (fileInput.files.length === 0) {
        showNotification("Vui lòng chọn một file để tải lên!", "error");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        showNotification("Vui lòng đăng nhập để tải file!", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const response = await fetch('http://localhost:4000/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const result = await response.text();
        showNotification(result, response.ok ? "success" : "error");
        if (response.ok) {
            loadFiles();
            fileInput.value = "";
        }
    } catch (err) {
        console.error('Lỗi tải file:', err);
        showNotification("Lỗi: Không thể kết nối đến server!", "error");
    }
}

// Gửi file đến người dùng khác
async function shareFile() {
    const recipientInput = document.getElementById("recipientInput").value.trim();
    const fileInput = document.getElementById("shareFileInput");

    if (!recipientInput) {
        showNotification("Vui lòng nhập ID hoặc tên tài khoản người nhận!", "error");
        return;
    }

    if (!fileInput || fileInput.files.length === 0) {
        showNotification("Vui lòng chọn một file để gửi!", "error");
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        showNotification("Vui lòng đăng nhập để gửi file!", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("recipient", recipientInput);

    try {
        const response = await fetch('http://localhost:4000/share', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const result = await response.text();
        showNotification(result, response.ok ? "success" : "error");
        if (response.ok) {
            loadFiles();
            fileInput.value = "";
            document.getElementById("recipientInput").value = "";
        }
    } catch (err) {
        console.error('Lỗi gửi file:', err);
        showNotification("Lỗi: Không thể kết nối đến server!", "error");
    }
}

// Tải danh sách file
async function loadFiles() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            showNotification("Vui lòng đăng nhập để xem danh sách file!", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
            return;
        }

        const response = await fetch('http://localhost:4000/files', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error("Không thể lấy danh sách file!");
        }
        const files = await response.json();
        const fileList = document.getElementById("fileList");
        if (!fileList) {
            console.error("Không tìm thấy phần tử fileList trong DOM");
            return;
        }
        fileList.innerHTML = "";
        files.forEach(file => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `${file.TenTapTin} (${(file.KichThuoc / 1024).toFixed(2)} KB) 
                <button class="download-btn" onclick="downloadFile(${file.ID_TapTin})">Tải xuống</button>
                <button class="delete-btn" onclick="deleteFile(${file.ID_TapTin})">Xóa</button>`;
            fileList.appendChild(listItem);
        });
    } catch (err) {
        console.error('Lỗi tải danh sách file:', err);
        showNotification("Lỗi khi tải danh sách file: Không thể kết nối đến server!", "error");
    }
}

// Tải file xuống
async function downloadFile(fileId) {
    const token = localStorage.getItem("token");
    if (!token) {
        showNotification("Vui lòng đăng nhập để tải file!", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1000);
        return;
    }

    try {
        const response = await fetch(`http://localhost:4000/download/${fileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            showNotification(errorText, "error");
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `file-${fileId}`;

        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1];
            }
        }

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        link.setAttribute("style", "display: none;");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Lỗi tải file xuống:', err);
        showNotification("Lỗi: Không thể tải file xuống!", "error");
    }
}

// Xóa file
async function deleteFile(fileId) {
    if (!confirm("Bạn có chắc muốn xóa file này?")) return;

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            showNotification("Vui lòng đăng nhập để xóa file!", "error");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
            return;
        }

        const response = await fetch(`http://localhost:4000/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.text();
        showNotification(result, response.ok ? "success" : "error");
        if (response.ok) {
            loadFiles();
        }
    } catch (err) {
        console.error('Lỗi xóa file:', err);
        showNotification("Lỗi: Không thể kết nối đến server!", "error");
    }
}

// Hàm hiển thị thông báo
function showNotification(message, type) {
    const notification = document.getElementById("notification");
    if (!notification) {
        console.error("Không tìm thấy phần tử notification trong DOM");
        return;
    }
    notification.textContent = message;
    notification.style.display = "block";
    notification.style.backgroundColor = type === "success" ? "#4CAF50" : "#f44336";
    setTimeout(() => {
        notification.style.display = "none";
    }, 1000);
}