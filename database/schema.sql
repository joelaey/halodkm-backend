-- HaloDKM Database Schema
-- PostgreSQL Database Migration File
-- Created for HaloDKM Mosque Management System
-- Scope: RT-level (within single RW)
-- Compatible with Supabase

-- ===== Auto-update timestamp function =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===== 1. Users Table =====
-- Stores system users (admin, jamaah)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'jamaah' CHECK (role IN ('admin', 'jamaah')),
    rt VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 2. Jamaah Table =====
-- Stores congregation members data
CREATE TABLE IF NOT EXISTS jamaah (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(16) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    rt VARCHAR(10) NOT NULL,
    no_hp VARCHAR(15) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jamaah_nik ON jamaah(nik);
CREATE INDEX IF NOT EXISTS idx_jamaah_rt ON jamaah(rt);
CREATE INDEX IF NOT EXISTS idx_jamaah_nama ON jamaah(nama);

CREATE OR REPLACE TRIGGER update_jamaah_updated_at
    BEFORE UPDATE ON jamaah
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 3. Kas Masjid Table =====
-- Stores mosque financial transactions
CREATE TABLE IF NOT EXISTS kas_masjid (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('masuk', 'keluar')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NULL,
    tanggal DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kas_type ON kas_masjid(type);
CREATE INDEX IF NOT EXISTS idx_kas_tanggal ON kas_masjid(tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_category ON kas_masjid(category);

CREATE OR REPLACE TRIGGER update_kas_masjid_updated_at
    BEFORE UPDATE ON kas_masjid
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 4. Info Publik Table =====
-- Stores public information about mosque and village activities
CREATE TABLE IF NOT EXISTS info_publik (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    tanggal DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_info_category ON info_publik(category);
CREATE INDEX IF NOT EXISTS idx_info_tanggal ON info_publik(tanggal);

CREATE OR REPLACE TRIGGER update_info_publik_updated_at
    BEFORE UPDATE ON info_publik
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 5. Audit Logs Table =====
-- Stores user activity logs for auditing
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- ===== 6. Families Table =====
-- Stores family head (kepala keluarga) data
CREATE TABLE IF NOT EXISTS families (
    id SERIAL PRIMARY KEY,
    no_kk VARCHAR(16) NOT NULL UNIQUE,
    kepala_keluarga VARCHAR(100) NOT NULL,
    rt VARCHAR(10) NOT NULL,
    alamat TEXT NULL,
    no_hp VARCHAR(15) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_families_no_kk ON families(no_kk);
CREATE INDEX IF NOT EXISTS idx_families_rt ON families(rt);
CREATE INDEX IF NOT EXISTS idx_families_kepala ON families(kepala_keluarga);

CREATE OR REPLACE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 7. Family Members Table =====
-- Stores family members data (anggota keluarga)
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    family_id INT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    nik VARCHAR(16) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    hubungan VARCHAR(30) NOT NULL CHECK (hubungan IN ('Kepala Keluarga', 'Istri', 'Anak', 'Orang Tua', 'Lainnya')),
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tanggal_lahir DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fm_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_fm_nik ON family_members(nik);
CREATE INDEX IF NOT EXISTS idx_fm_nama ON family_members(nama);

CREATE OR REPLACE TRIGGER update_family_members_updated_at
    BEFORE UPDATE ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== Sample Data =====
-- Insert default admin user (username: admin, password: admin123)
INSERT INTO users (username, password, full_name, role) 
VALUES ('admin', 'admin123', 'Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert sample jamaah user
INSERT INTO users (username, password, full_name, role, rt) 
VALUES ('jamaah1', 'jamaah123', 'Jamaah RT 01', 'jamaah', 'RT 01')
ON CONFLICT (username) DO NOTHING;

-- Insert sample jamaah data (per RT)
INSERT INTO jamaah (nik, nama, jenis_kelamin, rt, no_hp) VALUES
('3201010101010001', 'Ahmad Abdullah', 'Laki-laki', 'RT 01', '081234567890'),
('3201010202020002', 'Fatimah Zahra', 'Perempuan', 'RT 01', '081234567891'),
('3201010303030003', 'Muhammad Ali', 'Laki-laki', 'RT 02', '081234567892'),
('3201010404040004', 'Khadijah Aminah', 'Perempuan', 'RT 02', '081234567893'),
('3201010505050005', 'Umar Faruq', 'Laki-laki', 'RT 03', '081234567894'),
('3201010606060006', 'Aisyah Dewi', 'Perempuan', 'RT 03', '081234567895'),
('3201010707070007', 'Abu Bakar', 'Laki-laki', 'RT 04', '081234567896'),
('3201010808080008', 'Siti Maryam', 'Perempuan', 'RT 04', '081234567897'),
('3201010909090009', 'Usman Affan', 'Laki-laki', 'RT 01', '081234567898'),
('3201011010100010', 'Halimah Sari', 'Perempuan', 'RT 02', '081234567899')
ON CONFLICT (nik) DO NOTHING;

-- Insert sample kas masjid transactions
INSERT INTO kas_masjid (type, amount, description, category, tanggal) VALUES
('masuk', 5000000, 'Donasi Jumat Pertama Bulan', 'Donasi', CURRENT_DATE),
('masuk', 2500000, 'Infaq Jamaah', 'Infaq', CURRENT_DATE - INTERVAL '1 day'),
('keluar', 1500000, 'Bayar Listrik Masjid', 'Operasional', CURRENT_DATE - INTERVAL '2 days'),
('keluar', 800000, 'Beli Perlengkapan Kebersihan', 'Operasional', CURRENT_DATE - INTERVAL '3 days'),
('masuk', 10000000, 'Donasi Pembangunan Menara', 'Donasi', CURRENT_DATE - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- Insert sample info publik
INSERT INTO info_publik (title, content, category, tanggal) VALUES
('Pengajian Rutin Ahad Pagi', 'Pengajian rutin setiap hari Ahad pukul 07.00 WIB di Masjid Al-Ikhlas', 'Kegiatan Masjid', CURRENT_DATE),
('Kerja Bakti Dusun', 'Kerja bakti membersihkan lingkungan dusun setiap Sabtu pagi', 'Kegiatan Dusun', CURRENT_DATE - INTERVAL '1 day'),
('Sholat Tarawih Ramadhan', 'Jadwal sholat tarawih Ramadhan 1446 H dimulai pukul 19.30 WIB', 'Pengumuman', CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Insert sample families (per RT)
INSERT INTO families (no_kk, kepala_keluarga, rt, alamat, no_hp) VALUES
('3201010001', 'Ahmad Abdullah', 'RT 01', 'Jl. Masjid No. 1', '081234567890'),
('3201010002', 'Muhammad Ali', 'RT 02', 'Jl. Pesantren No. 5', '081234567892'),
('3201010003', 'Umar Faruq', 'RT 03', 'Jl. Pondok No. 12', '081234567894'),
('3201010004', 'Abdullah Rahman', 'RT 01', 'Jl. Masjid No. 15', '081298765432'),
('3201010005', 'Ibrahim Khalil', 'RT 02', 'Jl. Pesantren No. 22', '081287654321'),
('3201010006', 'Yusuf Hakim', 'RT 03', 'Jl. Pondok No. 8', '081276543210'),
('3201010007', 'Ismail Hasan', 'RT 04', 'Jl. Masjid No. 7', '081265432109'),
('3201010008', 'Zakariya Amin', 'RT 04', 'Jl. Pesantren No. 18', '081254321098'),
('3201010009', 'Musa Karim', 'RT 01', 'Jl. Pondok No. 25', '081243210987'),
('3201010010', 'Harun Said', 'RT 02', 'Jl. Masjid No. 11', '081232109876')
ON CONFLICT (no_kk) DO NOTHING;

-- Insert sample family members
INSERT INTO family_members (family_id, nik, nama, hubungan, jenis_kelamin, tanggal_lahir) VALUES
-- Family 1: Ahmad Abdullah (4 members)
(1, '3201010101010001', 'Ahmad Abdullah', 'Kepala Keluarga', 'Laki-laki', '1980-05-15'),
(1, '3201010202020002', 'Fatimah Zahra', 'Istri', 'Perempuan', '1985-08-20'),
(1, '3201010303030011', 'Hasan Ahmad', 'Anak', 'Laki-laki', '2010-03-12'),
(1, '3201010404040012', 'Husein Ahmad', 'Anak', 'Laki-laki', '2012-07-25'),
-- Family 2: Muhammad Ali (3 members)
(2, '3201010303030003', 'Muhammad Ali', 'Kepala Keluarga', 'Laki-laki', '1975-11-10'),
(2, '3201010404040004', 'Khadijah Aminah', 'Istri', 'Perempuan', '1978-04-18'),
(2, '3201010505050013', 'Aisyah Khadijah', 'Anak', 'Perempuan', '2005-09-30'),
-- Family 3: Umar Faruq (2 members)
(3, '3201010505050005', 'Umar Faruq', 'Kepala Keluarga', 'Laki-laki', '1982-02-28'),
(3, '3201010606060014', 'Ruqayyah Umar', 'Anak', 'Perempuan', '2015-01-05'),
-- Family 4: Abdullah Rahman (3 members)
(4, '3201010707070015', 'Abdullah Rahman', 'Kepala Keluarga', 'Laki-laki', '1978-06-22'),
(4, '3201010808080016', 'Maryam Siti', 'Istri', 'Perempuan', '1980-09-14'),
(4, '3201010909090017', 'Salman Abdullah', 'Anak', 'Laki-laki', '2008-12-03'),
-- Family 5: Ibrahim Khalil (3 members)
(5, '3201011212120020', 'Ibrahim Khalil', 'Kepala Keluarga', 'Laki-laki', '1983-03-08'),
(5, '3201011313130021', 'Asma Nur', 'Istri', 'Perempuan', '1986-07-16'),
(5, '3201011414140022', 'Yusuf Ibrahim', 'Anak', 'Laki-laki', '2014-11-22'),
-- Family 6: Yusuf Hakim (2 members)
(6, '3201011515150023', 'Yusuf Hakim', 'Kepala Keluarga', 'Laki-laki', '1979-01-30'),
(6, '3201011616160024', 'Hafsa Laila', 'Istri', 'Perempuan', '1981-04-25'),
-- Family 7: Ismail Hasan (2 members)
(7, '3201011919190027', 'Ismail Hasan', 'Kepala Keluarga', 'Laki-laki', '1987-12-17'),
(7, '3201012020200028', 'Zahra Ummi', 'Istri', 'Perempuan', '1990-02-23'),
-- Family 8: Zakariya Amin (3 members)
(8, '3201012121210029', 'Zakariya Amin', 'Kepala Keluarga', 'Laki-laki', '1976-08-09'),
(8, '3201012222220030', 'Amina Rahmah', 'Istri', 'Perempuan', '1977-11-15'),
(8, '3201012323230031', 'Ali Zakariya', 'Anak', 'Laki-laki', '2006-03-20'),
-- Family 9: Musa Karim (3 members)
(9, '3201012626260034', 'Musa Karim', 'Kepala Keluarga', 'Laki-laki', '1984-05-29'),
(9, '3201012727270035', 'Safiya Dewi', 'Istri', 'Perempuan', '1988-10-12'),
(9, '3201012828280036', 'Idris Musa', 'Anak', 'Laki-laki', '2016-01-14'),
-- Family 10: Harun Said (2 members)
(10, '3201012929290037', 'Harun Said', 'Kepala Keluarga', 'Laki-laki', '1981-07-04'),
(10, '3201013030300038', 'Nadia Putri', 'Istri', 'Perempuan', '1984-12-28')
ON CONFLICT (nik) DO NOTHING;

-- ===== 8. Penduduk Khusus Table =====
-- Stores non-permanent residents (kontrak, pedagang, warga dusun lain)
CREATE TABLE IF NOT EXISTS penduduk_khusus (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(16) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    jenis_kelamin VARCHAR(20) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    alamat TEXT NULL,
    no_hp VARCHAR(15) NULL,
    label VARCHAR(50) NOT NULL CHECK (label IN ('kontrak', 'pedagang', 'warga_dusun_lain')),
    keterangan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pk_nik ON penduduk_khusus(nik);
CREATE INDEX IF NOT EXISTS idx_pk_label ON penduduk_khusus(label);
CREATE INDEX IF NOT EXISTS idx_pk_nama ON penduduk_khusus(nama);

CREATE OR REPLACE TRIGGER update_penduduk_khusus_updated_at
    BEFORE UPDATE ON penduduk_khusus
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 9. Events Table =====
-- Stores event information for event-based financial tracking
-- tipe: 'penggalangan_dana' = financial only, 'distribusi' = financial + recipients
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(200) NOT NULL,
    deskripsi TEXT NULL,
    tipe VARCHAR(30) NOT NULL DEFAULT 'penggalangan_dana' CHECK (tipe IN ('penggalangan_dana', 'distribusi')),
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_tanggal ON events(tanggal_mulai);

CREATE OR REPLACE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 10. Event Kas Table =====
-- Stores event-specific financial transactions
CREATE TABLE IF NOT EXISTS event_kas (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('masuk', 'keluar')),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    tanggal DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_kas_event_id ON event_kas(event_id);
CREATE INDEX IF NOT EXISTS idx_event_kas_type ON event_kas(type);
CREATE INDEX IF NOT EXISTS idx_event_kas_tanggal ON event_kas(tanggal);

CREATE OR REPLACE TRIGGER update_event_kas_updated_at
    BEFORE UPDATE ON event_kas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 11. Event Recipients Table =====
-- Stores recipients/beneficiaries of events (e.g., zakat fitrah recipients, qurban meat recipients)
CREATE TABLE IF NOT EXISTS event_recipients (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    nama VARCHAR(100) NOT NULL,
    alamat TEXT NULL,
    no_hp VARCHAR(15) NULL,
    jenis_bantuan VARCHAR(100) NULL,
    jumlah VARCHAR(50) NULL,
    keterangan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_recipients_event_id ON event_recipients(event_id);
CREATE INDEX IF NOT EXISTS idx_event_recipients_nama ON event_recipients(nama);

CREATE OR REPLACE TRIGGER update_event_recipients_updated_at
    BEFORE UPDATE ON event_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== 12. Event Panitia Table =====
-- Stores event committee members with roles
-- source_type: 'penduduk_tetap' (from family_members) or 'penduduk_khusus' or 'manual'
CREATE TABLE IF NOT EXISTS event_panitia (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('penduduk_tetap', 'penduduk_khusus', 'manual')),
    source_id INT NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Anggota',
    no_hp VARCHAR(15) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_panitia_event_id ON event_panitia(event_id);
CREATE INDEX IF NOT EXISTS idx_event_panitia_role ON event_panitia(role);

CREATE OR REPLACE TRIGGER update_event_panitia_updated_at
    BEFORE UPDATE ON event_panitia
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== End of Schema =====

