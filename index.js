// ============================================================
// apisun.js - Lấy dữ liệu từ 2 API, xuất JSON đơn giản
// FIX: Thêm fallback và debug
// ============================================================

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// API URLs
// ============================================================
const API_1 = "http://103.249.117.201:49483/sunwin/tx?key=8e05cbaa4c25ebd5d69fef94130c5881b52fdc8f3bcaf479";
const API_2 = "https://skidvn.com/proxy.php?game_id=1";

// ============================================================
// HÀM FETCH DỮ LIỆU VỚI RETRY
// ============================================================
async function fetchData(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'vi-VN,vi;q=0.9',
                    'Referer': 'https://skidvn.com/',
                    'Origin': 'https://skidvn.com'
                },
                timeout: 15000
            });
            
            if (!response.ok) {
                console.log(`⚠️ API ${url} trả về HTTP ${response.status} (lần thử ${i+1})`);
                continue;
            }
            
            const data = await response.json();
            console.log(`✅ API ${url} thành công`);
            return data;
        } catch (error) {
            console.log(`⚠️ Lỗi fetch ${url}: ${error.message} (lần thử ${i+1})`);
            if (i === retries - 1) {
                return { error: true, message: error.message };
            }
            // Đợi 1 giây rồi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return { error: true, message: 'Max retries exceeded' };
}

// ============================================================
// HÀM EXTRACT DỮ LIỆU
// ============================================================
function extractData(data) {
    // Dò tìm dữ liệu bên trong
    let inner = data;
    if (data && data.data) {
        inner = data.data;
    } else if (data && data.success && data.data) {
        inner = data.data;
    }
    
    // Lấy xúc xắc
    const xx1 = parseInt(inner.xuc_xac_1) || 0;
    const xx2 = parseInt(inner.xuc_xac_2) || 0;
    const xx3 = parseInt(inner.xuc_xac_3) || 0;
    
    // Lấy phien
    let phien = '???';
    if (inner.phien_hien_tai && inner.phien_hien_tai !== 'null' && inner.phien_hien_tai !== '') {
        phien = inner.phien_hien_tai;
    } else if (inner.phien && inner.phien !== 'null' && inner.phien !== '') {
        phien = inner.phien;
    } else if (inner.session && inner.session !== 'null') {
        phien = inner.session;
    }
    
    const tong = xx1 + xx2 + xx3;
    let ketqua = '';
    if (tong < 11) ketqua = 'Xỉu';
    else if (tong > 11) ketqua = 'Tài';
    else ketqua = 'Tài';
    
    // Debug log
    console.log(`📊 Extracted: phien=${phien}, xx1=${xx1}, xx2=${xx2}, xx3=${xx3}, tong=${tong}, ketqua=${ketqua}`);
    
    return {
        phien: phien,
        xx1: xx1,
        xx2: xx2,
        xx3: xx3,
        tong: tong,
        ketqua: ketqua
    };
}

// ============================================================
// ROUTE CHÍNH - /apisun
// ============================================================
app.get('/apisun', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('🔍 Bắt đầu gọi API...');
    
    try {
        // Gọi cả 2 API song song
        const [data1, data2] = await Promise.all([
            fetchData(API_1),
            fetchData(API_2)
        ]);
        
        console.log('📦 API 1:', data1 ? 'có dữ liệu' : 'null');
        console.log('📦 API 2:', data2 ? 'có dữ liệu' : 'null');
        
        // Extract dữ liệu
        const extracted1 = data1 && !data1.error ? extractData(data1) : null;
        const extracted2 = data2 && !data2.error ? extractData(data2) : null;
        
        // ===== TỔNG HỢP KẾT QUẢ =====
        let result = {};
        
        // Ưu tiên API 2 (có phien)
        if (extracted2 && extracted2.phien !== '???') {
            result = extracted2;
            console.log('✅ Dùng API 2 làm nguồn chính');
            
            // Nếu xx = 0, lấy xx từ API 1
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
            console.log('✅ Dùng API 1 làm nguồn chính');
        } else {
            console.log('❌ Cả 2 API đều lỗi, dùng dữ liệu mẫu');
            result = {
                phien: '???',
                xx1: 0,
                xx2: 0,
                xx3: 0,
                tong: 0,
                ketqua: '???'
            };
        }
        
        // ===== CHỈ XUẤT ĐÚNG CÁC TRƯỜNG YÊU CẦU =====
        const finalResult = {
            phien: result.phien || '???',
            xx1: result.xx1 || 0,
            xx2: result.xx2 || 0,
            xx3: result.xx3 || 0,
            tong: result.tong || 0,
            ketqua: result.ketqua || '???'
        };
        
        console.log('📤 Output:', finalResult);
        res.json(finalResult);
        
    } catch (error) {
        console.log('❌ Lỗi:', error.message);
        res.json({
            phien: '???',
            xx1: 0,
            xx2: 0,
            xx3: 0,
            tong: 0,
            ketqua: '???'
        });
    }
});

// ============================================================
// ROUTE TEST - /test (để debug)
// ============================================================
app.get('/test', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const result = {
        status: 'ok',
        time: new Date().toISOString(),
        api1: null,
        api2: null
    };
    
    // Test API 1
    try {
        const data1 = await fetchData(API_1);
        result.api1 = data1;
    } catch (e) {
        result.api1 = { error: e.message };
    }
    
    // Test API 2
    try {
        const data2 = await fetchData(API_2);
        result.api2 = data2;
    } catch (e) {
        result.api2 = { error: e.message };
    }
    
    res.json(result);
});

// ============================================================
// ROUTE GỐC - /
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
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Endpoint: /apisun`);
    console.log(`🔧 Test: /test`);
});
