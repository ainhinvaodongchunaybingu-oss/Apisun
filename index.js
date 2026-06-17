// ============================================================
// apisun.js - Lấy dữ liệu từ cả 2 API (Fix kết nối)
// ============================================================
const express = require('express');
const fetch = require('node-fetch');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// CẤU HÌNH API
// ============================================================
const CONFIG = {
    // API 1 - Hoạt động tốt
    api1: "http://103.249.117.201:49483/sunwin/tx?key=8e05cbaa4c25ebd5d69fef94130c5881b52fdc8f3bcaf479",
    
    // API 2 - Dùng proxy để vượt Cloudflare
    api2: "https://api.allorigins.win/raw?url=https://skidvn.com/proxy.php?game_id=1",
    
    // API 2 trực tiếp (dự phòng)
    api2_direct: "https://skidvn.com/proxy.php?game_id=1",
    
    timeout: 15000,
    retries: 2
};

// ============================================================
// HÀM FETCH VỚI RETRY + AGENT SSL
// ============================================================
const agent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
});

async function fetchWithRetry(url, retries = CONFIG.retries, useProxy = true) {
    // Nếu là api2_direct và có proxy, dùng proxy
    let finalUrl = url;
    if (url === CONFIG.api2_direct && useProxy) {
        finalUrl = CONFIG.api2;
        console.log(`🔄 Dùng proxy cho API 2`);
    }
    
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.timeout);
            
            const response = await fetch(finalUrl, {
                method: 'GET',
                agent: agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://skidvn.com/',
                    'Origin': 'https://skidvn.com',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Connection': 'keep-alive'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            if (!response.ok) {
                console.log(`⚠️ HTTP ${response.status} - ${finalUrl}`);
                if (i === retries - 1 && url === CONFIG.api2_direct) {
                    // Thử lại với proxy
                    return fetchWithRetry(url, 1, true);
                }
                continue;
            }
            
            const data = await response.json();
            console.log(`✅ Thành công: ${finalUrl}`);
            return data;
            
        } catch (error) {
            console.log(`⚠️ Lỗi (lần ${i+1}): ${error.message}`);
            if (i === retries - 1 && url === CONFIG.api2_direct) {
                // Thử lại với proxy
                console.log(`🔄 Thử lại API 2 với proxy...`);
                return fetchWithRetry(url, 1, true);
            }
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
    
    // Lấy phien
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
    
    return { phien, xx1, xx2, xx3, tong, ketqua, raw: data };
}

// ============================================================
// SO SÁNH VÀ CHỌN DỮ LIỆU TỐT NHẤT
// ============================================================
function selectBestData(extracted1, extracted2) {
    let score1 = 0, score2 = 0;
    
    if (extracted1) {
        if (extracted1.phien && extracted1.phien !== 'null' && extracted1.phien !== '???') score1 += 10;
        if (extracted1.xx1 > 0 || extracted1.xx2 > 0 || extracted1.xx3 > 0) score1 += 5;
    }
    
    if (extracted2) {
        if (extracted2.phien && extracted2.phien !== 'null' && extracted2.phien !== '???') score2 += 10;
        if (extracted2.xx1 > 0 || extracted2.xx2 > 0 || extracted2.xx3 > 0) score2 += 5;
    }
    
    console.log(`📊 Điểm API 1: ${score1}, API 2: ${score2}`);
    
    if (score1 >= score2 && extracted1) {
        return { data: extracted1, source: 'API 1', score: score1 };
    } else if (extracted2) {
        return { data: extracted2, source: 'API 2', score: score2 };
    }
    
    return null;
}

// ============================================================
// ENDPOINT CHÍNH - /apisun
// ============================================================
app.get('/apisun', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log('🔍 Đang lấy dữ liệu từ cả 2 API...');
    
    try {
        // ===== GỌI CẢ 2 API SONG SONG =====
        const [data1, data2] = await Promise.all([
            fetchWithRetry(CONFIG.api1),
            fetchWithRetry(CONFIG.api2_direct) // Sẽ tự động dùng proxy nếu cần
        ]);
        
        // ===== EXTRACT DỮ LIỆU =====
        const extracted1 = data1 ? extractData(data1) : null;
        const extracted2 = data2 ? extractData(data2) : null;
        
        console.log('📦 API 1:', extracted1 ? 'có dữ liệu' : 'null');
        console.log('📦 API 2:', extracted2 ? 'có dữ liệu' : 'null');
        
        // ===== CHỌN DỮ LIỆU TỐT NHẤT =====
        const best = selectBestData(extracted1, extracted2);
        
        if (!best) {
            console.log('❌ Không có dữ liệu từ API');
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
        
        // ===== XUẤT KẾT QUẢ =====
        const output = {
            phien: best.data.phien || '???',
            xx1: best.data.xx1 || 0,
            xx2: best.data.xx2 || 0,
            xx3: best.data.xx3 || 0,
            tong: best.data.tong || 0,
            ketqua: best.data.ketqua || '???'
        };
        
        console.log(`📤 Output (${best.source} - điểm ${best.score}):`, output);
        res.json(output);
        
    } catch (error) {
        console.log('❌ Lỗi:', error.message);
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
        fetchWithRetry(CONFIG.api2_direct)
    ]);
    
    const extracted1 = data1 ? extractData(data1) : null;
    const extracted2 = data2 ? extractData(data2) : null;
    const best = selectBestData(extracted1, extracted2);
    
    res.json({
        time: new Date().toISOString(),
        api1: {
            raw: data1,
            extracted: extracted1
        },
        api2: {
            raw: data2,
            extracted: extracted2
        },
        best: best,
        config: {
            api1: CONFIG.api1,
            api2_direct: CONFIG.api2_direct,
            api2_proxy: CONFIG.api2
        }
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
    console.log(`📡 /apisun - Dữ liệu chính`);
    console.log(`🔧 /test - Debug`);
    console.log(`🌐 Proxy API 2: ${CONFIG.api2}`);
});
