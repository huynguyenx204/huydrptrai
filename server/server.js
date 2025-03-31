const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Cấu hình middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Cấu hình multer để lưu file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// In ra các biến môi trường để debug
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_SERVER:', process.env.DB_SERVER);
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('PORT:', process.env.PORT);

// Cấu hình kết nối SQL Server
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: { encrypt: true, trustServerCertificate: true }
};

// Kiểm tra cấu hình trước khi chạy server
if (!dbConfig.server || typeof dbConfig.server !== 'string') {
    console.error('Lỗi: DB_SERVER không được định nghĩa hoặc không phải là chuỗi trong file .env');
    process.exit(1);
}

if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.error('Lỗi: Thiếu thông tin DB_USER, DB_PASSWORD, hoặc DB_DATABASE trong file .env');
    process.exit(1);
}

// Middleware kiểm tra token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Không có token');

    jwt.verify(token, 'your_jwt_secret', (err, user) => {
        if (err) return res.status(403).send('Token không hợp lệ');
        req.user = user;
        next();
    });
};

// API đăng ký
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).send('Vui lòng nhập đầy đủ thông tin!');
    }

    try {
        const pool = await sql.connect(dbConfig);
        const checkUser = await pool.request()
            .input('TenDangNhap', sql.NVarChar, username)
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM NguoiDung WHERE TenDangNhap = @TenDangNhap OR Email = @Email');
        
        if (checkUser.recordset.length > 0) {
            return res.status(400).send('Tên đăng nhập hoặc email đã tồn tại!');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('TenDangNhap', sql.NVarChar, username)
            .input('MatKhauHash', sql.NVarChar, hashedPassword)
            .input('Email', sql.NVarChar, email)
            .query('INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, Email, TrangThai) OUTPUT INSERTED.ID_NguoiDung VALUES (@TenDangNhap, @MatKhauHash, @Email, \'Active\')');
        
        const userId = result.recordset[0].ID_NguoiDung;
        res.status(200).json({ message: `Đăng ký thành công! ID Tài Khoản: ${userId}`, userId });
    } catch (err) {
        console.error('Lỗi đăng ký:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API đăng nhập
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Vui lòng nhập đầy đủ thông tin!');
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('TenDangNhap', sql.NVarChar, username)
            .query('SELECT * FROM NguoiDung WHERE TenDangNhap = @TenDangNhap AND TrangThai = \'Active\'');
        
        const user = result.recordset[0];
        if (!user) return res.status(401).send('Tên đăng nhập không tồn tại hoặc tài khoản bị khóa');

        console.log('User data:', user); // Thêm log để kiểm tra dữ liệu user

        const match = await bcrypt.compare(password, user.MatKhauHash);
        if (!match) return res.status(401).send('Mật khẩu không đúng');

        await pool.request()
            .input('ID_NguoiDung', sql.Int, user.ID_NguoiDung)
            .query('UPDATE NguoiDung SET LastLogin = GETDATE() WHERE ID_NguoiDung = @ID_NguoiDung');

        const token = jwt.sign({ id: user.ID_NguoiDung, username: user.TenDangNhap }, 'your_jwt_secret', { expiresIn: '1h' });
        console.log('Generated token:', token); // Thêm log để kiểm tra token
        res.status(200).json({ token, userId: user.ID_NguoiDung });
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API tải file lên
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
        return res.status(400).send('Vui lòng chọn file để tải lên!');
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('TenTapTin', sql.NVarChar, file.originalname)
            .input('KichThuoc', sql.BigInt, file.size)
            .input('LoaiTapTin', sql.NVarChar, file.mimetype)
            .input('DuongDan', sql.NVarChar, file.path)
            .input('NguoiUp', sql.Int, userId)
            .query('INSERT INTO TapTin (TenTapTin, KichThuoc, LoaiTapTin, DuongDan, NguoiUp) VALUES (@TenTapTin, @KichThuoc, @LoaiTapTin, @DuongDan, @NguoiUp)');
        res.status(200).send('Tải lên thành công!');
    } catch (err) {
        console.error('Lỗi tải file:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API gửi file đến người dùng khác
app.post('/share', authenticateToken, upload.single('file'), async (req, res) => {
    const file = req.file;
    const senderId = req.user.id;
    const recipient = req.body.recipient;

    if (!file) {
        return res.status(400).send('Vui lòng chọn file để gửi!');
    }

    if (!recipient) {
        return res.status(400).send('Vui lòng nhập ID hoặc tên tài khoản người nhận!');
    }

    try {
        const pool = await sql.connect(dbConfig);
        let recipientId;

        // Kiểm tra xem recipient là ID hay tên tài khoản
        if (!isNaN(recipient)) {
            // Nếu là ID
            const result = await pool.request()
                .input('ID_NguoiDung', sql.Int, recipient)
                .query('SELECT ID_NguoiDung FROM NguoiDung WHERE ID_NguoiDung = @ID_NguoiDung');
            if (result.recordset.length === 0) {
                return res.status(404).send('Người dùng không tồn tại!');
            }
            recipientId = result.recordset[0].ID_NguoiDung;
        } else {
            // Nếu là tên tài khoản
            const result = await pool.request()
                .input('TenDangNhap', sql.NVarChar, recipient)
                .query('SELECT ID_NguoiDung FROM NguoiDung WHERE TenDangNhap = @TenDangNhap');
            if (result.recordset.length === 0) {
                return res.status(404).send('Người dùng không tồn tại!');
            }
            recipientId = result.recordset[0].ID_NguoiDung;
        }

        // Lưu file với NguoiUp là recipientId
        await pool.request()
            .input('TenTapTin', sql.NVarChar, file.originalname)
            .input('KichThuoc', sql.BigInt, file.size)
            .input('LoaiTapTin', sql.NVarChar, file.mimetype)
            .input('DuongDan', sql.NVarChar, file.path)
            .input('NguoiUp', sql.Int, recipientId)
            .query('INSERT INTO TapTin (TenTapTin, KichThuoc, LoaiTapTin, DuongDan, NguoiUp) VALUES (@TenTapTin, @KichThuoc, @LoaiTapTin, @DuongDan, @NguoiUp)');
        
        res.status(200).send('Gửi file thành công!');
    } catch (err) {
        console.error('Lỗi gửi file:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API lấy danh sách file
app.get('/files', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('NguoiUp', sql.Int, userId)
            .query('SELECT * FROM TapTin WHERE NguoiUp = @NguoiUp');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Lỗi lấy danh sách file:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API xóa file
app.delete('/files/:id', authenticateToken, async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.id;

    try {
        const pool = await sql.connect(dbConfig);
        const checkFile = await pool.request()
            .input('ID_TapTin', sql.Int, fileId)
            .input('NguoiUp', sql.Int, userId)
            .query('SELECT DuongDan FROM TapTin WHERE ID_TapTin = @ID_TapTin AND NguoiUp = @NguoiUp');

        if (checkFile.recordset.length === 0) {
            return res.status(404).send('File không tồn tại hoặc bạn không có quyền xóa!');
        }

        const filePath = checkFile.recordset[0].DuongDan;
        fs.unlinkSync(filePath);

        await pool.request()
            .input('ID_TapTin', sql.Int, fileId)
            .query('DELETE FROM TapTin WHERE ID_TapTin = @ID_TapTin');

        res.status(200).send('Xóa file thành công!');
    } catch (err) {
        console.error('Lỗi xóa file:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// API tải file xuống
app.get('/download/:id', authenticateToken, async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.id;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('ID_TapTin', sql.Int, fileId)
            .input('NguoiUp', sql.Int, userId)
            .query('SELECT DuongDan, TenTapTin FROM TapTin WHERE ID_TapTin = @ID_TapTin AND NguoiUp = @NguoiUp');

        if (result.recordset.length === 0) {
            return res.status(404).send('File không tồn tại hoặc bạn không có quyền truy cập!');
        }

        const filePath = result.recordset[0].DuongDan;
        const fileName = result.recordset[0].TenTapTin;

        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File không tồn tại trên hệ thống!');
        }

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Lỗi gửi file:', err);
                res.status(500).send('Lỗi khi tải file xuống!');
            }
        });
    } catch (err) {
        console.error('Lỗi tải file xuống:', err);
        res.status(500).send('Lỗi: ' + err.message);
    }
});

// Khởi động server
app.listen(process.env.PORT || 4000, () => {
    console.log(`Server chạy trên cổng ${process.env.PORT || 4000}`);
});