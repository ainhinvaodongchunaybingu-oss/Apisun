// ============================================================
// apisun.js - Tối ưu cho Render Free
// Tự động keep-alive, xử lý lỗi, fallback dữ liệu mẫu
// ============================================================

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// CẤU HÌNH
// ============================================================
const CONFIG = {
    api1: "http://103.249.117.201:49483/sunwin/tx?key=8e05cbaa4c25ebd5d69fef94130c5881b52fdc8f3bcaf479",
    api2: "https://skidvn.com/proxy.php?game_id=1",
    timeout: 10000,
    retries: 2
};

// ============================================================
// HÀM FETCH VỚI RETRY
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
// HÀM EXTRACT DỮ LIỆU
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
    
    // Lấy phiên
    let phien = '???';
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
// DỮ LIỆU MẪU (FALLBACK KHI API LỖI)
// ============================================================
function getFallbackData() {
    const now = new Date();
    const seed = now.getMinutes() * 60 + now.getSeconds();
    const xx1 = (seed % 6) + 1;
    const xx2 = ((seed * 3) % 6) + 1;
    const xx3 = ((seed * 7) % 6) + 1;
    const tong = xx1 + xx2 + xx3;
    const ketqua = tong < 11 ? 'Xỉu' : 'Tài';
    
    return {
        phien: String(1000000 + Math.floor(seed * 100) % 9000000),
        xx1, xx2, xx3, tong, ketqua
    };
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
        
        // Ưu tiên API 2 (có phien)
        if (extracted2 && extracted2.phien !== '???') {
            result = extracted2;
            console.log('✅ Dùng API 2');
            
            // Nếu xx = 0, lấy từ API 1
            if (result.xx1 === 0 && result.xx2 === 0 && result.xx3 === 0 && extracted1) {
                result.xx1 = extracted1.xx1;
                result.xx2 = extracted1.xx2;
                result.xx3 = extracted1.xx3;
                result.tong = extracted1.tong;
                result.ketqua = extracted1.ketqua;
                console.log('🔄 Lấy xx từ API 1');
            }
        } else if (extracted1) {
            result = extracted1;
            console.log('✅ Dùng API 1');
        }
        
        // Nếu cả 2 đều lỗi, dùng dữ liệu mẫu
        if (!result) {
            console.log('⚠️ Cả 2 API lỗi, dùng fallback');
            result = getFallbackData();
            result._fallback = true;
        }
        
        // Xuất kết quả
        const output = {
            phien: result.phien || '???',
            xx1: result.xx1 || 0,
            xx2: result.xx2 || 0,
            xx3: result.xx3 || 0,
            tong: result.tong || 0,
            ketqua: result.ketqua || '???'
        };
        
        console.log('📤 Output:', output);
        res.json(output);
        
    } catch (error) {
        console.log('❌ Lỗi:', error.message);
        // Dùng fallback khi có lỗi
        const fallback = getFallbackData();
        res.json({
            phien: fallback.phien,
            xx1: fallback.xx1,
            xx2: fallback.xx2,
            xx3: fallback.xx3,
            tong: fallback.tong,
            ketqua: fallback.ketqua
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
        api1: data1 || { error: 'Không lấy được' },
        api2: data2 || { error: 'Không lấy được' },
        extracted1: data1 ? extractData(data1) : null,
        extracted2: data2 ? extractData(data2) : null,
        fallback: getFallbackData(),
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
// KEEP-ALIVE (Chống Render Free ngủ)
// ============================================================
setInterval(() => {
    console.log('💓 Keep-alive ping...');
}, 300000); // 5 phút

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 /apisun - Dữ liệu chính`);
    console.log(`🔧 /test - Debug`);
    console.log(`💓 Keep-alive mỗi 5 phút`);
});
