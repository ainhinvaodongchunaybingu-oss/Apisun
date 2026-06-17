// ============================================================
// apisun.js - Chỉ lấy phiên thật từ API, không tạo phiên ảo
// ============================================================
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// CẤU HÌNH API
// ============================================================
const CONFIG = {
    api1: "http://103.249.117.201:49483/sunwin/tx?key=8e05cbaa4c25ebd5d69fef94130c5881b52fdc8f3bcaf479",
    api2: "https://skidvn.com/proxy.php?game_id=1",
    timeout: 8000,
    retries: 2
};

// ============================================================
// HÀM FETCH DỮ LIỆU
// ============================================================
async function fetchWithRetry(url, retries = CONFIG.retries) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'vi-VN,vi;q=0.9',
                    'Referer': 'https://skidvn.com/',
                    'Origin': 'https://skidvn.com'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                console.log(`⚠️ HTTP ${response.status} - ${url}`);
                continue;
            }
            
            const data = await response.json();
            console.log(`✅ Thành công: ${url}`);
            return data;
            
        } catch (error) {
            console.log(`⚠️ Lỗi (lần ${i+1}): ${error.message}`);
            if (i === retries - 1) return null;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    return null;
}

// ============================================================
// HÀM EXTRACT DỮ LIỆU - CHỈ LẤY PHIEN THẬT
// ============================================================
function extractData(raw) {
    // Tìm dữ liệu bên trong
    let data = raw;
    if (raw && raw.data) data = raw.data;
    else if (raw && raw.success && raw.data) data = raw.data;
    
    // Lấy giá trị
    const xx1 = parseInt(data.xuc_xac_1) || 0;
    const xx2 = parseInt(data.xuc_xac_2) || 0;
    const xx3 = parseInt(data.xuc_xac_3) || 0;
    
    // ===== CHỈ LẤY PHIEN THẬT, KHÔNG TẠO ẢO =====
    let phien = null;
    if (data.phien_hien_tai && data.phien_hien_tai !== 'null' && data.phien_hien_tai !== '') {
        phien = data.phien_hien_tai;
    } else if (data.phien && data.phien !== 'null' && data.phien !== '') {
        phien = data.phien;
    } else if (data.session && data.session !== 'null') {
        phien = data.session;
    }
    
    const tong = xx1 + xx2 + xx3;
    let ketqua = '???';
    if (tong < 11) ketqua = 'Xỉu';
    else if (tong > 11) ketqua = 'Tài';
    else if (tong === 11) ketqua = 'Tài';
    
    return { phien, xx1, xx2, xx3, tong, ketqua };
}

// ============================================================
// ENDPOINT CHÍNH - /apisun
// ============================================================
app.get('/apisun', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log('🔍 Đang lấy dữ liệu...');
    
    try {
        // Gọi cả 2 API song song
        const [data1, data2] = await Promise.all([
            fetchWithRetry(CONFIG.api1),
            fetchWithRetry(CONFIG.api2)
        ]);
        
        // Extract dữ liệu
        const extracted1 = data1 ? extractData(data1) : null;
        const extracted2 = data2 ? extractData(data2) : null;
        
        let result = null;
        let source = 'none';
        
        // ===== ƯU TIÊN LẤY DỮ LIỆU CÓ PHIEN THẬT =====
        if (extracted2 && extracted2.phien !== null) {
            result = extracted2;
            source = 'API 2 (có phien)';
            console.log('✅ Dùng API 2 - có phien thật');
        } else if (extracted1 && extracted1.phien !== null) {
            result = extracted1;
            source = 'API 1 (có phien)';
            console.log('✅ Dùng API 1 - có phien thật');
        } else if (extracted2 && extracted2.xx1 > 0) {
            // API 2 có xx nhưng không có phien
            result = extracted2;
            source = 'API 2 (ko phien)';
            console.log('⚠️ Dùng API 2 - không có phien');
        } else if (extracted1 && extracted1.xx1 > 0) {
            result = extracted1;
            source = 'API 1 (ko phien)';
            console.log('⚠️ Dùng API 1 - không có phien');
        }
        
        // Nếu không có dữ liệu từ API
        if (!result) {
            console.log('❌ Không có dữ liệu từ API');
            // KHÔNG TẠO FALLBACK, trả về lỗi
            res.status(503).json({
                phien: '???',
                xx1: 0,
                xx2: 0,
                xx3: 0,
                tong: 0,
                ketqua: '???',
                error: true,
                message: 'Không lấy được dữ liệu từ API'
            });
            return;
        }
        
        // ===== KHÔNG TẠO PHIÊN ẢO =====
        // Nếu phien là null hoặc rỗng, giữ nguyên null (sẽ hiển thị ???)
        const output = {
            phien: result.phien || '???',
            xx1: result.xx1 || 0,
            xx2: result.xx2 || 0,
            xx3: result.xx3 || 0,
            tong: result.tong || 0,
            ketqua: result.ketqua || '???'
        };
        
        // Thêm warning nếu không có phien
        if (!result.phien) {
            output._warning = 'Không có phiên thật từ API';
        }
        
        console.log(`📤 Output (${source}):`, output);
        res.json(output);
        
    } catch (error) {
        console.log('❌ Lỗi:', error.message);
        // KHÔNG TẠO FALLBACK, trả về lỗi
        res.status(500).json({
            phien: '???',
            xx1: 0,
            xx2: 0,
            xx3: 0,
            tong: 0,
            ketqua: '???',
            error: true,
            message: error.message
        });
    }
});

// ============================================================
// ENDPOINT TEST - /test
// ============================================================
app.get('/test', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const [data1, data2] = await Promise.all([
        fetchWithRetry(CONFIG.api1),
        fetchWithRetry(CONFIG.api2)
    ]);
    
    res.json({
        api1_raw: data1,
        api2_raw: data2,
        extracted1: data1 ? extractData(data1) : null,
        extracted2: data2 ? extractData(data2) : null,
        time: new Date().toISOString()
    });
});

// ============================================================
// ENDPOINT GỐC - /
// ============================================================
app.get('/', (req, res) => {
    res.json({
        name: 'API Sunwin',
        endpoints: ['/apisun', '/test'],
        status: 'running',
        time: new Date().toISOString()
    });
});

// ============================================================
// KEEP-ALIVE
// ============================================================
setInterval(() => {
    console.log('💓 Keep-alive ping...');
}, 300000);

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 /apisun - Dữ liệu chính (không tạo phiên ảo)`);
    console.log(`🔧 /test - Debug`);
});
