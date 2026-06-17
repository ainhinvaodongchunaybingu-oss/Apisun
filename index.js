// ============================================================
// apisun.js - Lấy dữ liệu từ 2 API, xuất JSON
// Dùng cho Render.com (Node.js)
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
// HÀM FETCH DỮ LIỆU
// ============================================================
async function fetchData(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            },
            timeout: 15000
        });
        
        if (!response.ok) {
            return { error: true, message: `HTTP ${response.status}` };
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        return { error: true, message: error.message };
    }
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
    if (inner.phien_hien_tai && inner.phien_hien_tai !== 'null') {
        phien = inner.phien_hien_tai;
    } else if (inner.phien && inner.phien !== 'null') {
        phien = inner.phien;
    } else if (inner.session) {
        phien = inner.session;
    }
    
    const tong = xx1 + xx2 + xx3;
    let ketqua = '';
    if (tong < 11) ketqua = 'Xỉu';
    else if (tong > 11) ketqua = 'Tài';
    else ketqua = 'Tài';
    
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
    
    try {
        // Gọi cả 2 API song song
        const [data1, data2] = await Promise.all([
            fetchData(API_1),
            fetchData(API_2)
        ]);
        
        // Extract dữ liệu
        const extracted1 = data1 && !data1.error ? extractData(data1) : null;
        const extracted2 = data2 && !data2.error ? extractData(data2) : null;
        
        // ===== TỔNG HỢP KẾT QUẢ =====
        let result = {};
        
        // Ưu tiên API 2 (có phien)
        if (extracted2 && extracted2.phien !== '???') {
            result = extracted2;
            result.source = 'API 2';
            
            // Nếu xx = 0, lấy xx từ API 1
            if (result.xx1 === 0 && result.xx2 === 0 && result.xx3 === 0 && extracted1) {
                result.xx1 = extracted1.xx1;
                result.xx2 = extracted1.xx2;
                result.xx3 = extracted1.xx3;
                result.tong = extracted1.tong;
                result.ketqua = extracted1.ketqua;
                result.source = 'API 2 (phien) + API 1 (xx)';
            }
        } else if (extracted1) {
            result = extracted1;
            result.source = 'API 1';
        } else {
            result = {
                phien: '???',
                xx1: 0,
                xx2: 0,
                xx3: 0,
                tong: 0,
                ketqua: '???',
                source: 'error',
                error: true,
                message: 'Cả 2 API đều lỗi'
            };
        }
        
        // Thêm thời gian
        result.time = new Date().toISOString().replace('T', ' ').slice(0, 19);
        
        res.json(result);
        
    } catch (error) {
        res.json({
            error: true,
            message: error.message,
            time: new Date().toISOString().replace('T', ' ').slice(0, 19)
        });
    }
});

// ============================================================
// ROUTE GỐC - /
// ============================================================
app.get('/', (req, res) => {
    res.json({
        name: 'API Sunwin',
        endpoint: '/apisun',
        status: 'running',
        time: new Date().toISOString().replace('T', ' ').slice(0, 19)
    });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Endpoint: /apisun`);
});
