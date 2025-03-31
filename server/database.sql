-- Chọn database cần sử dụng
USE gui_nhan_file;
GO

-- Xóa bảng TapTin nếu tồn tại
IF OBJECT_ID('dbo.TapTin', 'U') IS NOT NULL
    DROP TABLE dbo.TapTin;
GO

-- Xóa bảng NguoiDung nếu tồn tại
IF OBJECT_ID('dbo.NguoiDung', 'U') IS NOT NULL
    DROP TABLE dbo.NguoiDung;
GO

---------------------------------------------------
-- Tạo bảng NguoiDung
---------------------------------------------------
CREATE TABLE NguoiDung (
    ID_NguoiDung INT IDENTITY(1,1) PRIMARY KEY,
    TenDangNhap NVARCHAR(50) UNIQUE NOT NULL,
    MatKhauHash NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    TrangThai NVARCHAR(20) DEFAULT 'Active',
    LastLogin DATETIME NULL,
    NgayTao DATETIME DEFAULT GETDATE()
);
GO

---------------------------------------------------
-- Tạo bảng TapTin
---------------------------------------------------
CREATE TABLE TapTin (
    ID_TapTin INT IDENTITY(1,1) PRIMARY KEY,
    TenTapTin NVARCHAR(255) NOT NULL,
    KichThuoc BIGINT NOT NULL,
    LoaiTapTin NVARCHAR(50),
    DuongDan NVARCHAR(255),  -- Trường lưu đường dẫn file
    NguoiUp INT FOREIGN KEY REFERENCES NguoiDung(ID_NguoiDung) ON DELETE CASCADE,
    ThoiGianUp DATETIME DEFAULT GETDATE()
);
GO

---------------------------------------------------
-- Chèn dữ liệu mẫu vào bảng NguoiDung
---------------------------------------------------
-- Mật khẩu "password123" được mã hóa bằng bcrypt
INSERT INTO NguoiDung (TenDangNhap, MatKhauHash, Email)
VALUES ('admin', '$2b$10$z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1', 'admin@example.com'),
       ('user1', '$2b$10$z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1', 'user1@example.com'),
       ('user2', '$2b$10$z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1z5Xz7e1q2Yk1', 'user2@example.com');
GO

---------------------------------------------------
-- Chèn dữ liệu mẫu vào bảng TapTin
---------------------------------------------------
INSERT INTO TapTin (TenTapTin, KichThuoc, LoaiTapTin, DuongDan, NguoiUp)
VALUES ('file1.pdf', 204800, 'pdf', '/uploads/file1.pdf', 1),
       ('image1.jpg', 102400, 'jpg', '/uploads/image1.jpg', 1);
GO

---------------------------------------------------
-- Truy vấn kiểm tra dữ liệu
---------------------------------------------------
SELECT * FROM NguoiDung;
GO

SELECT * FROM TapTin;
GO