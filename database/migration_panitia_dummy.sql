-- Migration: Add event_panitia table
-- Run this SQL in your database (Supabase/PostgreSQL)

-- Create event_panitia table
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

-- Insert dummy penduduk khusus
INSERT INTO penduduk_khusus (nik, nama, jenis_kelamin, alamat, no_hp, label, keterangan) VALUES
('3201020101010001', 'Bambang Sutrisno', 'Laki-laki', 'Kos Pak Budi No. 5', '081234567801', 'kontrak', 'Karyawan pabrik, kontrak 1 tahun'),
('3201020202020002', 'Siti Aminah', 'Perempuan', 'Rumah Kontrakan Jl. Melati 12', '081234567802', 'kontrak', 'Guru TK, kontrak 2 tahun'),
('3201020303030003', 'Hendra Gunawan', 'Laki-laki', 'Kos Ibu Sri No. 8', '081234567803', 'kontrak', 'Mahasiswa semester akhir'),
('3201020404040004', 'Dewi Lestari', 'Perempuan', 'Kontrakan Blok C No. 3', '081234567804', 'kontrak', 'Pegawai bank'),
('3201020505050005', 'Agus Salim', 'Laki-laki', 'Pasar Minggu Stand A12', '081234567805', 'pedagang', 'Pedagang sayur'),
('3201020606060006', 'Ibu Marni', 'Perempuan', 'Pasar Minggu Stand B05', '081234567806', 'pedagang', 'Pedagang bumbu dapur'),
('3201020707070007', 'Pak Joko', 'Laki-laki', 'Pasar Minggu Stand C08', '081234567807', 'pedagang', 'Pedagang daging'),
('3201020808080008', 'Bu Tuti', 'Perempuan', 'Depan Masjid', '081234567808', 'pedagang', 'Pedagang gorengan'),
('3201020909090009', 'Ahmad Fauzi', 'Laki-laki', 'Dusun Sukamaju RT 05', '081234567809', 'warga_dusun_lain', 'Warga Dusun Sukamaju'),
('3201021010100010', 'Fatimah Wati', 'Perempuan', 'Dusun Cempaka RT 02', '081234567810', 'warga_dusun_lain', 'Warga Dusun Cempaka'),
('3201021111110011', 'Rudi Hartono', 'Laki-laki', 'Dusun Melati RT 03', '081234567811', 'warga_dusun_lain', 'Warga Dusun Melati'),
('3201021212120012', 'Sri Wahyuni', 'Perempuan', 'Dusun Kenanga RT 01', '081234567812', 'warga_dusun_lain', 'Warga Dusun Kenanga')
ON CONFLICT (nik) DO NOTHING;

-- Insert dummy events with transactions
INSERT INTO events (nama, deskripsi, tipe, tanggal_mulai, status) VALUES
('Pengajian Rutin Ramadhan 1446H', 'Kegiatan pengajian rutin selama bulan Ramadhan', 'penggalangan_dana', '2024-12-01', 'aktif'),
('Distribusi Zakat Fitrah 1446H', 'Penyaluran zakat fitrah kepada mustahik', 'distribusi', '2024-12-10', 'aktif'),
('Qurban Idul Adha 1446H', 'Penyembelihan dan distribusi daging qurban', 'distribusi', '2024-12-15', 'aktif')
ON CONFLICT DO NOTHING;

-- Get event IDs and insert transactions
DO $$
DECLARE
    pengajian_id INT;
    zakat_id INT;
    qurban_id INT;
BEGIN
    -- Get or set event IDs
    SELECT id INTO pengajian_id FROM events WHERE nama LIKE '%Pengajian%' LIMIT 1;
    SELECT id INTO zakat_id FROM events WHERE nama LIKE '%Zakat%' LIMIT 1;
    SELECT id INTO qurban_id FROM events WHERE nama LIKE '%Qurban%' LIMIT 1;
    
    -- Insert transactions for Pengajian event
    IF pengajian_id IS NOT NULL THEN
        INSERT INTO event_kas (event_id, type, amount, description, tanggal) VALUES
        (pengajian_id, 'masuk', 5000000, 'Donasi Jamaah Pak Ahmad', CURRENT_DATE - INTERVAL '10 days'),
        (pengajian_id, 'masuk', 2500000, 'Infaq Ibu Fatimah', CURRENT_DATE - INTERVAL '8 days'),
        (pengajian_id, 'masuk', 1000000, 'Donasi Jamaah Anonymous', CURRENT_DATE - INTERVAL '5 days'),
        (pengajian_id, 'keluar', 500000, 'Konsumsi Pengajian', CURRENT_DATE - INTERVAL '7 days'),
        (pengajian_id, 'keluar', 300000, 'Honor Ustadz', CURRENT_DATE - INTERVAL '6 days');
    END IF;
    
    -- Insert transactions for Zakat event
    IF zakat_id IS NOT NULL THEN
        INSERT INTO event_kas (event_id, type, amount, description, tanggal) VALUES
        (zakat_id, 'masuk', 10000000, 'Zakat Fitrah dari Jamaah RT 01', CURRENT_DATE - INTERVAL '5 days'),
        (zakat_id, 'masuk', 8000000, 'Zakat Fitrah dari Jamaah RT 02', CURRENT_DATE - INTERVAL '4 days'),
        (zakat_id, 'masuk', 7500000, 'Zakat Fitrah dari Jamaah RT 03', CURRENT_DATE - INTERVAL '3 days'),
        (zakat_id, 'keluar', 500000, 'Biaya Operasional Penyaluran', CURRENT_DATE - INTERVAL '2 days');
        
        -- Insert recipients for Zakat
        INSERT INTO event_recipients (event_id, nama, alamat, jenis_bantuan, jumlah, keterangan) VALUES
        (zakat_id, 'Bapak Suryadi', 'RT 01 No. 15', 'Beras', '10 kg', 'Keluarga Kurang Mampu'),
        (zakat_id, 'Ibu Kartini', 'RT 02 No. 8', 'Beras', '10 kg', 'Janda Miskin'),
        (zakat_id, 'Bapak Saleh', 'RT 03 No. 22', 'Beras', '10 kg', 'Fakir Miskin'),
        (zakat_id, 'Ibu Rahmah', 'RT 01 No. 5', 'Beras', '10 kg', 'Anak Yatim'),
        (zakat_id, 'Bapak Hamzah', 'RT 02 No. 12', 'Beras', '10 kg', 'Keluarga Kurang Mampu');
    END IF;
    
    -- Insert transactions for Qurban event
    IF qurban_id IS NOT NULL THEN
        INSERT INTO event_kas (event_id, type, amount, description, tanggal) VALUES
        (qurban_id, 'masuk', 25000000, 'Iuran Qurban Sapi 1 (5 orang)', CURRENT_DATE - INTERVAL '15 days'),
        (qurban_id, 'masuk', 25000000, 'Iuran Qurban Sapi 2 (5 orang)', CURRENT_DATE - INTERVAL '14 days'),
        (qurban_id, 'masuk', 3500000, 'Iuran Qurban Kambing', CURRENT_DATE - INTERVAL '13 days'),
        (qurban_id, 'keluar', 2000000, 'Biaya Penyembelihan', CURRENT_DATE - INTERVAL '1 day'),
        (qurban_id, 'keluar', 500000, 'Biaya Plastik & Perlengkapan', CURRENT_DATE - INTERVAL '1 day');
        
        -- Insert recipients for Qurban
        INSERT INTO event_recipients (event_id, nama, alamat, jenis_bantuan, jumlah, keterangan) VALUES
        (qurban_id, 'Kel. Bapak Ahmad', 'RT 01', 'Daging Sapi', '2 kg', 'Warga Tetap'),
        (qurban_id, 'Kel. Ibu Siti', 'RT 01', 'Daging Sapi', '2 kg', 'Warga Tetap'),
        (qurban_id, 'Bambang Sutrisno', 'Kos Pak Budi', 'Daging Kambing', '1 kg', 'Warga Kontrak'),
        (qurban_id, 'Pak Agus Pedagang', 'Pasar', 'Daging Sapi', '1.5 kg', 'Pedagang'),
        (qurban_id, 'Kel. Ahmad Fauzi', 'Dusun Sukamaju', 'Daging Sapi', '1.5 kg', 'Warga Dusun Lain');
    END IF;
END $$;

SELECT 'Migration and dummy data completed!' as status;
