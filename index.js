// ============================================================
// api_predict_render.js - Dự đoán Tài/Xỉu từ API
// Dùng cho Render.com - CHỈ DỰ ĐOÁN 1 LẦN/PHIÊN
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

// CORS - CHO PHÉP TẤT CẢ DOMAIN KẾT NỐI
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ============================================================
// CẤU HÌNH
// ============================================================
const CONFIG = {
    API_URL: 'https://trails-wish-motel-legacy.trycloudflare.com/api/tx',
    POLL_INTERVAL: 3000, // 3 giây
    HISTORY_KEY: "sun_predict_history_v1",
    PATTERN_MEM_KEY: "sun_predict_pattern_mem_v1",
    ERROR_MEM_KEY: "sun_predict_error_mem_v1",
    MAX_HISTORY_STORE: 2000,
    MARKOV_ORDER: 3,
    RUN_WINDOW_SHORT: 6,
    RUN_WINDOW_LONG: 20,
    BASE_CONFIDENCE: 0.5,
    MODELS: ['markov', 'run_length', 'momentum', 'pattern'],
    CREATOR_ID: '@bucactaodi'
};

// ============================================================
// CHỐNG NGỦ RENDER
// ============================================================
let keepAliveCount = 0;

// Tự động ping chính nó mỗi 5 phút để tránh sleep
setInterval(() => {
    const pingUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    fetch(`${pingUrl}/`)
        .then(() => {
            keepAliveCount++;
            console.log(`💓 Keep-alive ping #${keepAliveCount} at ${new Date().toISOString()}`);
        })
        .catch(() => {
            // Silent fail
        });
}, 300000); // 5 phút

// ============================================================
// UTILITIES
// ============================================================
function nowStr() { return (new Date()).toISOString(); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function last(arr, n = 1) { return arr.slice(Math.max(arr.length - n, 0)); }

function counts(seq) {
    const c = { T: 0, X: 0 };
    seq.forEach(s => { if (s === 'T') c.T++; else c.X++; });
    return c;
}

function computeRunLength(seq) {
    if (!seq.length) return { value: null, run: 0 };
    let lastVal = seq[seq.length - 1];
    let run = 1;
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === lastVal) run++;
        else break;
    }
    return { value: lastVal, run };
}

function seqFromHistory(history) {
    return history.map(h => {
        if (typeof h === 'string') return h;
        if (h.Ket_qua) return (h.Ket_qua === 'Tài' || h.Ket_qua === 'Tai' || h.Ket_qua === 'T') ? 'T' : 'X';
        if (h.ket_qua) return (h.ket_qua === 'Tài' || h.ket_qua === 'Tai' || h.ket_qua === 'T') ? 'T' : 'X';
        if (h.result) return h.result === 'T' ? 'T' : 'X';
        return 'X';
    });
}

// ============================================================
// PATTERN DATABASE - THUẬT TOÁN MỚI
// ============================================================
const PATTERN_DB = {
    "TXT": { "prediction": "Xỉu", "confidence": 68 },
    "TTXX": { "prediction": "Tài", "confidence": 87 },
    "XXTXX": { "prediction": "Tài", "confidence": 59 },
    "TTX": { "prediction": "Xỉu", "confidence": 73 },
    "XTT": { "prediction": "Tài", "confidence": 92 },
    "TXX": { "prediction": "Tài", "confidence": 55 },
    "XTX": { "prediction": "Xỉu", "confidence": 81 },
    "TXTX": { "prediction": "Tài", "confidence": 64 },
    "XTXX": { "prediction": "Tài", "confidence": 77 },
    "XXTX": { "prediction": "Tài", "confidence": 96 },
    "TXTT": { "prediction": "Xỉu", "confidence": 71 },
    "TTT": { "prediction": "Tài", "confidence": 83 },
    "XXX": { "prediction": "Tài", "confidence": 52 },
    "TXXT": { "prediction": "Tài", "confidence": 94 },
    "XTXT": { "prediction": "Xỉu", "confidence": 63 },
    "XXTT": { "prediction": "Tài", "confidence": 79 },
    "XTTX": { "prediction": "Tài", "confidence": 88 },
    "XTXTX": { "prediction": "Tài", "confidence": 75 },
    "TTXXX": { "prediction": "Tài", "confidence": 61 },
    "XTTXT": { "prediction": "Tài", "confidence": 69 },
    "XXTXT": { "prediction": "Xỉu", "confidence": 84 },
    "TXTTX": { "prediction": "Tài", "confidence": 53 },
    "XTXXT": { "prediction": "Tài", "confidence": 91 },
    "TTTXX": { "prediction": "Xỉu", "confidence": 72 },
    "XXTTT": { "prediction": "Tài", "confidence": 65 },
    "XTXTT": { "prediction": "Tài", "confidence": 97 },
    "TXTXT": { "prediction": "Tài", "confidence": 56 },
    "TTXTX": { "prediction": "Xỉu", "confidence": 78 },
    "TXTTT": { "prediction": "Xỉu", "confidence": 62 },
    "XXTXTX": { "prediction": "Tài", "confidence": 85 },
    "XTXXTX": { "prediction": "Tài", "confidence": 74 },
    "TXTTTX": { "prediction": "Tài", "confidence": 66 },
    "TTTTXX": { "prediction": "Xỉu", "confidence": 89 },
    "XTXTTX": { "prediction": "Tài", "confidence": 51 },
    "XTXXTT": { "prediction": "Tài", "confidence": 82 },
    "TXXTXX": { "prediction": "Tài", "confidence": 93 },
    "XXTXXT": { "prediction": "Tài", "confidence": 76 },
    "TXTTXX": { "prediction": "Xỉu", "confidence": 67 },
    "TTTXTX": { "prediction": "Xỉu", "confidence": 58 },
    "TTXTTT": { "prediction": "Tài", "confidence": 95 },
    "TXXTTX": { "prediction": "Tài", "confidence": 54 },
    "XXTTTX": { "prediction": "Tài", "confidence": 86 },
    "XTTTTX": { "prediction": "Xỉu", "confidence": 70 },
    "TXTXTT": { "prediction": "Tài", "confidence": 60 },
    "TXTXTX": { "prediction": "Tài", "confidence": 80 },
    "TTTTX": { "prediction": "Tài", "confidence": 90 },
    "XXXTX": { "prediction": "Tài", "confidence": 84 },
    "XTXXXT": { "prediction": "Tài", "confidence": 67 },
    "XXTTXX": { "prediction": "Tài", "confidence": 79 },
    "TTTXXT": { "prediction": "Xỉu", "confidence": 62 },
    "XXTXXX": { "prediction": "Tài", "confidence": 91 },
    "XTXTXT": { "prediction": "Tài", "confidence": 55 },
    "TTXXTX": { "prediction": "Tài", "confidence": 88 },
    "TTXXT": { "prediction": "Tài", "confidence": 77 },
    "TXXTX": { "prediction": "Xỉu", "confidence": 69 },
    "XTXXX": { "prediction": "Tài", "confidence": 83 },
    "XTXTX": { "prediction": "Xỉu", "confidence": 72 },
    "TTXT": { "prediction": "Xỉu", "confidence": 61 },
    "TTTXT": { "prediction": "Xỉu", "confidence": 75 },
    "TTTT": { "prediction": "Tài", "confidence": 94 },
    "TTTTT": { "prediction": "Tài", "confidence": 57 },
    "TTTTTT": { "prediction": "Xỉu", "confidence": 86 },
    "TTTTTTT": { "prediction": "Tài", "confidence": 65 },
    "TTTTTTX": { "prediction": "Xỉu", "confidence": 78 },
    "TTTTTX": { "prediction": "Xỉu", "confidence": 53 },
    "TTTTTXT": { "prediction": "Xỉu", "confidence": 89 },
    "TTTTTXX": { "prediction": "Tài", "confidence": 70 },
    "TTTTXT": { "prediction": "Xỉu", "confidence": 81 },
    "TTTTXTT": { "prediction": "Tài", "confidence": 63 },
    "TTTTXTX": { "prediction": "Xỉu", "confidence": 92 },
    "TTTTXXT": { "prediction": "Xỉu", "confidence": 56 },
    "TTTTXXX": { "prediction": "Tài", "confidence": 85 },
    "TTTX": { "prediction": "Xỉu", "confidence": 74 },
    "TTTXTT": { "prediction": "Tài", "confidence": 66 },
    "TTTXTTT": { "prediction": "Xỉu", "confidence": 97 },
    "TTTXTTX": { "prediction": "Xỉu", "confidence": 59 },
    "TTTXTXT": { "prediction": "Tài", "confidence": 82 },
    "TTTXTXX": { "prediction": "Tài", "confidence": 71 },
    "TTTXXTT": { "prediction": "Tài", "confidence": 60 },
    "TTTXXTX": { "prediction": "Tài", "confidence": 90 },
    "TTTXXX": { "prediction": "Xỉu", "confidence": 64 },
    "TTTXXXT": { "prediction": "Tài", "confidence": 87 },
    "TTTXXXX": { "prediction": "Xỉu", "confidence": 76 },
    "TTXTT": { "prediction": "Xỉu", "confidence": 93 },
    "TTXTTTT": { "prediction": "Xỉu", "confidence": 68 },
    "TTXTTTX": { "prediction": "Xỉu", "confidence": 80 },
    "TTXTTX": { "prediction": "Tài", "confidence": 58 },
    "TTXTTXT": { "prediction": "Tài", "confidence": 95 },
    "TTXTTXX": { "prediction": "Xỉu", "confidence": 54 },
    "TTXTXT": { "prediction": "Xỉu", "confidence": 83 },
    "TTXTXTT": { "prediction": "Tài", "confidence": 72 },
    "TTXTXTX": { "prediction": "Tài", "confidence": 61 },
    "TTXTXX": { "prediction": "Xỉu", "confidence": 89 },
    "TTXTXXT": { "prediction": "Tài", "confidence": 70 },
    "TTXTXXX": { "prediction": "Xỉu", "confidence": 79 },
    "TTXXTT": { "prediction": "Tài", "confidence": 57 },
    "TTXXTTT": { "prediction": "Xỉu", "confidence": 84 },
    "TTXXTTX": { "prediction": "Tài", "confidence": 67 },
    "TTXXTXT": { "prediction": "Tài", "confidence": 96 },
    "TTXXTXX": { "prediction": "Xỉu", "confidence": 51 },
    "TTXXXT": { "prediction": "Xỉu", "confidence": 75 },
    "TTXXXTT": { "prediction": "Tài", "confidence": 62 },
    "TTXXXTX": { "prediction": "Tài", "confidence": 91 },
    "TTXXXX": { "prediction": "Xỉu", "confidence": 73 },
    "TTXXXXT": { "prediction": "Tài", "confidence": 82 },
    "TTXXXXX": { "prediction": "Xỉu", "confidence": 66 },
    "TXTTTT": { "prediction": "Xỉu", "confidence": 94 },
    "TXTTTTT": { "prediction": "Xỉu", "confidence": 59 },
    "TXTTTTX": { "prediction": "Xỉu", "confidence": 85 },
    "TXTTTXT": { "prediction": "Xỉu", "confidence": 77 },
    "TXTTTXX": { "prediction": "Tài", "confidence": 68 },
    "TXTTXT": { "prediction": "Tài", "confidence": 86 },
    "TXTTXTT": { "prediction": "Tài", "confidence": 55 },
    "TXTTXTX": { "prediction": "Tài", "confidence": 74 },
    "TXTTXXT": { "prediction": "Tài", "confidence": 92 },
    "TXTTXXX": { "prediction": "Tài", "confidence": 63 },
    "TXTXTTT": { "prediction": "Tài", "confidence": 81 },
    "TXTXTTX": { "prediction": "Tài", "confidence": 70 },
    "TXTXTXT": { "prediction": "Xỉu", "confidence": 89 },
    "TXTXTXX": { "prediction": "Tài", "confidence": 58 },
    "TXTXX": { "prediction": "Tài", "confidence": 97 },
    "TXTXXT": { "prediction": "Tài", "confidence": 64 },
    "TXTXXTT": { "prediction": "Tài", "confidence": 83 },
    "TXTXXTX": { "prediction": "Xỉu", "confidence": 72 },
    "TXTXXX": { "prediction": "Xỉu", "confidence": 61 },
    "TXTXXXT": { "prediction": "Xỉu", "confidence": 90 },
    "TXTXXXX": { "prediction": "Xỉu", "confidence": 53 },
    "TXXTT": { "prediction": "Tài", "confidence": 87 },
    "TXXTTT": { "prediction": "Tài", "confidence": 76 },
    "TXXTTTT": { "prediction": "Tài", "confidence": 65 },
    "TXXTTTX": { "prediction": "Tài", "confidence": 54 },
    "TXXTTXT": { "prediction": "Xỉu", "confidence": 93 },
    "TXXTTXX": { "prediction": "Xỉu", "confidence": 82 },
    "TXXTXT": { "prediction": "Tài", "confidence": 71 },
    "TXXTXTT": { "prediction": "Tài", "confidence": 60 },
    "TXXTXTX": { "prediction": "Tài", "confidence": 95 },
    "TXXTXXT": { "prediction": "Tài", "confidence": 84 },
    "TXXTXXX": { "prediction": "Xỉu", "confidence": 73 },
    "TXXX": { "prediction": "Tài", "confidence": 62 },
    "TXXXT": { "prediction": "Tài", "confidence": 91 },
    "TXXXTT": { "prediction": "Xỉu", "confidence": 57 },
    "TXXXTTT": { "prediction": "Tài", "confidence": 86 },
    "TXXXTTX": { "prediction": "Xỉu", "confidence": 75 },
    "TXXXTX": { "prediction": "Xỉu", "confidence": 64 },
    "TXXXTXT": { "prediction": "Tài", "confidence": 97 },
    "TXXXTXX": { "prediction": "Xỉu", "confidence": 66 },
    "TXXXX": { "prediction": "Xỉu", "confidence": 85 },
    "TXXXXT": { "prediction": "Tài", "confidence": 74 },
    "TXXXXTT": { "prediction": "Xỉu", "confidence": 63 },
    "TXXXXTX": { "prediction": "Xỉu", "confidence": 92 },
    "TXXXXX": { "prediction": "Tài", "confidence": 51 },
    "TXXXXXT": { "prediction": "Xỉu", "confidence": 80 },
    "TXXXXXX": { "prediction": "Xỉu", "confidence": 69 },
    "XTTT": { "prediction": "Xỉu", "confidence": 88 },
    "XTTTT": { "prediction": "Xỉu", "confidence": 77 },
    "XTTTTT": { "prediction": "Tài", "confidence": 56 },
    "XTTTTTT": { "prediction": "Tài", "confidence": 95 },
    "XTTTTTX": { "prediction": "Tài", "confidence": 64 },
    "XTTTTXT": { "prediction": "Tài", "confidence": 83 },
    "XTTTTXX": { "prediction": "Xỉu", "confidence": 72 },
    "XTTTX": { "prediction": "Tài", "confidence": 61 },
    "XTTTXT": { "prediction": "Xỉu", "confidence": 90 },
    "XTTTXTT": { "prediction": "Tài", "confidence": 59 },
    "XTTTXTX": { "prediction": "Xỉu", "confidence": 78 },
    "XTTTXX": { "prediction": "Tài", "confidence": 87 },
    "XTTTXXT": { "prediction": "Tài", "confidence": 66 },
    "XTTTXXX": { "prediction": "Tài", "confidence": 55 },
    "XTTXTT": { "prediction": "Tài", "confidence": 94 },
    "XTTXTTT": { "prediction": "Tài", "confidence": 73 },
    "XTTXTTX": { "prediction": "Tài", "confidence": 82 },
    "XTTXTX": { "prediction": "Xỉu", "confidence": 71 },
    "XTTXTXT": { "prediction": "Tài", "confidence": 60 },
    "XTTXTXX": { "prediction": "Xỉu", "confidence": 89 },
    "XTTXX": { "prediction": "Xỉu", "confidence": 58 },
    "XTTXXT": { "prediction": "Xỉu", "confidence": 97 },
    "XTTXXTT": { "prediction": "Tài", "confidence": 76 },
    "XTTXXTX": { "prediction": "Xỉu", "confidence": 65 },
    "XTTXXX": { "prediction": "Tài", "confidence": 84 },
    "XTTXXXT": { "prediction": "Xỉu", "confidence": 53 },
    "XTTXXXX": { "prediction": "Tài", "confidence": 92 },
    "XTXTTT": { "prediction": "Tài", "confidence": 81 },
    "XTXTTTT": { "prediction": "Tài", "confidence": 70 },
    "XTXTTTX": { "prediction": "Xỉu", "confidence": 99 },
    "XTXTTXT": { "prediction": "Xỉu", "confidence": 68 },
    "XTXTTXX": { "prediction": "Tài", "confidence": 87 },
    "XTXTXTT": { "prediction": "Tài", "confidence": 56 },
    "XTXTXTX": { "prediction": "Xỉu", "confidence": 95 },
    "XTXTXX": { "prediction": "Tài", "confidence": 74 },
    "XTXTXXT": { "prediction": "Tài", "confidence": 83 },
    "XTXTXXX": { "prediction": "Tài", "confidence": 62 },
    "XTXXTTT": { "prediction": "Tài", "confidence": 91 },
    "XTXXTTX": { "prediction": "Xỉu", "confidence": 60 },
    "XTXXTXT": { "prediction": "Tài", "confidence": 79 },
    "XTXXTXX": { "prediction": "Tài", "confidence": 68 },
    "XTXXXTT": { "prediction": "Xỉu", "confidence": 97 },
    "XTXXXTX": { "prediction": "Tài", "confidence": 86 },
    "XTXXXX": { "prediction": "Xỉu", "confidence": 75 },
    "XTXXXXT": { "prediction": "Tài", "confidence": 64 },
    "XTXXXXX": { "prediction": "Tài", "confidence": 93 },
    "XXT": { "prediction": "Xỉu", "confidence": 82 },
    "XXTTTT": { "prediction": "Tài", "confidence": 71 },
    "XXTTTTT": { "prediction": "Xỉu", "confidence": 60 },
    "XXTTTTX": { "prediction": "Tài", "confidence": 89 },
    "XXTTTXT": { "prediction": "Xỉu", "confidence": 78 },
    "XXTTTXX": { "prediction": "Xỉu", "confidence": 67 },
    "XXTTX": { "prediction": "Tài", "confidence": 96 },
    "XXTTXT": { "prediction": "Xỉu", "confidence": 55 },
    "XXTTXTT": { "prediction": "Xỉu", "confidence": 94 },
    "XXTTXTX": { "prediction": "Tài", "confidence": 73 },
    "XXTTXXT": { "prediction": "Xỉu", "confidence": 62 },
    "XXTTXXX": { "prediction": "Tài", "confidence": 81 },
    "XXTXTT": { "prediction": "Tài", "confidence": 70 },
    "XXTXTTT": { "prediction": "Tài", "confidence": 99 },
    "XXTXTTX": { "prediction": "Xỉu", "confidence": 58 },
    "XXTXTXT": { "prediction": "Tài", "confidence": 87 },
    "XXTXTXX": { "prediction": "Tài", "confidence": 76 },
    "XXTXXTT": { "prediction": "Xỉu", "confidence": 65 },
    "XXTXXTX": { "prediction": "Xỉu", "confidence": 94 },
    "XXTXXXT": { "prediction": "Tài", "confidence": 83 },
    "XXTXXXX": { "prediction": "Tài", "confidence": 72 },
    "XXXT": { "prediction": "Tài", "confidence": 61 },
    "XXXTT": { "prediction": "Xỉu", "confidence": 90 },
    "XXXTTT": { "prediction": "Xỉu", "confidence": 79 },
    "XXXTTTT": { "prediction": "Xỉu", "confidence": 68 },
    "XXXTTTX": { "prediction": "Xỉu", "confidence": 97 },
    "XXXTTX": { "prediction": "Tài", "confidence": 56 },
    "XXXTTXT": { "prediction": "Xỉu", "confidence": 85 },
    "XXXTTXX": { "prediction": "Xỉu", "confidence": 74 },
    "XXXTXT": { "prediction": "Tài", "confidence": 63 },
    "XXXTXTT": { "prediction": "Tài", "confidence": 92 },
    "XXXTXTX": { "prediction": "Xỉu", "confidence": 51 },
    "XXXTXX": { "prediction": "Tài", "confidence": 80 },
    "XXXTXXT": { "prediction": "Xỉu", "confidence": 69 },
    "XXXTXXX": { "prediction": "Tài", "confidence": 98 },
    "XXXX": { "prediction": "Tài", "confidence": 57 },
    "XXXXT": { "prediction": "Xỉu", "confidence": 86 },
    "XXXXTT": { "prediction": "Xỉu", "confidence": 75 },
    "XXXXTTT": { "prediction": "Tài", "confidence": 64 },
    "XXXXTTX": { "prediction": "Tài", "confidence": 93 },
    "XXXXTX": { "prediction": "Tài", "confidence": 82 },
    "XXXXTXT": { "prediction": "Tài", "confidence": 71 },
    "XXXXTXX": { "prediction": "Tài", "confidence": 60 },
    "XXXXX": { "prediction": "Tài", "confidence": 89 },
    "XXXXXT": { "prediction": "Xỉu", "confidence": 78 },
    "XXXXXTT": { "prediction": "Tài", "confidence": 67 },
    "XXXXXTX": { "prediction": "Tài", "confidence": 96 },
    "XXXXXX": { "prediction": "Tài", "confidence": 55 },
    "XXXXXXT": { "prediction": "Tài", "confidence": 94 },
    "XXXXXXX": { "prediction": "Tài", "confidence": 83 }
};



// ============================================================
// MANUAL PATTERNS
// ============================================================
const MANUAL_PATTERNS = [
    { pair: [15, 6], pred: 'T', note: '15 6 → Tài' },
    { pair: [15, 9], pred: 'X', note: '15 9 → Xỉu' },
    { pair: [10, 8], pred: 'X', note: '10 8 → Xỉu' },
    { pair: [9, 10, 8], pred: 'X', note: '9 10 8 → Xỉu' },
    { pair: [6, 9], pred: 'T', note: '6 9 → Tài' },
    { pair: [10, 6, 9], pred: 'T', note: '10 6 9 → Tài' },
    { pair: [10, 6], pred: 'X', note: '10 6 → Xỉu' },
    { pair: [10, 8, 9], pred: 'T', note: '10 8 9 → Tài' },
    { pair: [9, 14], pred: 'X', note: '9 14 → Xỉu' },
    { pair: [8, 9, 14], pred: 'X', note: '8 9 14 → Xỉu' },
    { pair: [8, 9, 14, 7], pred: 'X', note: '8 9 14 7 → Xỉu' },
    { pair: [14, 7, 9], pred: 'X', note: '14 7 9 → Xỉu' },
    { pair: [7, 9, 4], pred: 'T', note: '7 9 4 → Tài' },
    { pair: [9, 4], pred: 'T', note: '9 4 → Tài' },
    { pair: [4, 13], pred: 'X', note: '4 13 → Xỉu' },
    { pair: [4, 13, 10], pred: 'T', note: '4 13 10 → Tài' },
    { pair: [13, 10], pred: 'T', note: '13 10 → Tài' },
    { pair: [13, 10, 18], pred: 'T', note: '13 10 18 → Tài' },
    { pair: [10, 18], pred: 'T', note: '10 18 → Tài' },
    { pair: [18, 11], pred: 'X', note: '18 11 → Xỉu' },
    { pair: [10, 18, 11], pred: 'X', note: '10 18 11 → Xỉu' },
    { pair: [8, 14], pred: 'X', note: '8 14 → Xỉu' },
    { pair: [8, 11], pred: 'T', note: '8 11 → Tài' },
    { pair: [18, 11, 8], pred: 'T', note: '18 11 8 → Tài' },
    { pair: [14, 8, 9], pred: 'T', note: '14 8 9 → Tài' },
    { pair: [13, 8, 9], pred: 'T', note: '13 8 9 → Tài' },
    { pair: [8, 9, 11], pred: 'T', note: '8 9 11 → Tài' },
    { pair: [8, 9, 11, 11], pred: 'T', note: '8 9 11 11 → Tài' },
    { pair: [11, 11], pred: 'T', note: '11 11 → Tài' },
    { pair: [9, 11, 11], pred: 'T', note: '9 11 11 → Tài' },
    { pair: [11, 11, 18], pred: 'T', note: '11 11 18 → Tài' },
    { pair: [11, 18], pred: 'T', note: '11 18 → Tài' },
    { pair: [18, 13], pred: 'X', note: '18 13 → Xỉu' },
    { pair: [18, 16], pred: 'T', note: '18 16 → Tài' },
    { pair: [18, 15], pred: 'T', note: '18 15 → Tài' },
    { pair: [18, 15, 11], pred: 'X', note: '18 15 11 → Xỉu' },
    { pair: [15, 11], pred: 'X', note: '15 11 → Xỉu' },
    { pair: [11, 7], pred: 'X', note: '11 7 → Xỉu' },
    { pair: [7, 6], pred: 'T', note: '7 6 → Tài' },
    { pair: [7, 6, 13], pred: 'X', note: '7 6 13 → Xỉu' },
    { pair: [6, 13], pred: 'X', note: '6 13 → Xỉu' },
    { pair: [11, 7, 6], pred: 'T', note: '11 7 6 → Tài' },
    { pair: [18, 17], pred: 'T', note: '18 17 → Tài' },
    { pair: [17, 15], pred: 'T', note: '17 15 → Tài' },
    { pair: [17, 12], pred: 'X', note: '17 12 → Xỉu' },
    { pair: [17, 17], pred: 'T', note: '17 17 → Tài' },
    { pair: [17, 18], pred: 'T', note: '17 18 → Tài' },
    { pair: [17, 13, 13], pred: 'X', note: '17 13 13 → Xỉu' },
    { pair: [15, 13], pred: 'X', note: '15 13 → Xỉu' },
    { pair: [13, 9], pred: 'X', note: '13 9 → Xỉu' },
    { pair: [6, 13, 9], pred: 'X', note: '6 13 9 → Xỉu' },
    { pair: [9, 6], pred: 'T', note: '9 6 → Tài' },
    { pair: [13, 9, 6], pred: 'T', note: '13 9 6 → Tài' },
    { pair: [9, 6, 14], pred: 'T', note: '9 6 14 → Tài' },
    { pair: [6, 14], pred: 'T', note: '6 14 → Tài' },
    { pair: [6, 14, 11], pred: 'X', note: '6 14 11 → Xỉu' },
    { pair: [14, 11], pred: 'X', note: '14 11 → Xỉu' },
    { pair: [11, 10], pred: 'T', note: '11 10 → Tài' },
    { pair: [14, 11, 10], pred: 'T', note: '14 11 10 → Tài' },
    { pair: [11, 10, 13], pred: 'T', note: '11 10 13 → Tài' },
    { pair: [10, 13], pred: 'X', note: '10 13 → Xỉu' },
    { pair: [14, 11, 10, 13], pred: 'X', note: '14 11 10 13 → Xỉu' },
    { pair: [10, 13, 5], pred: 'X', note: '10 13 5 → Xỉu' },
    { pair: [13, 5], pred: 'X', note: '13 5 → Xỉu' },
    { pair: [13, 5, 8], pred: 'T', note: '13 5 8 → Tài' },
    { pair: [5, 8], pred: 'T', note: '5 8 → Tài' },
    { pair: [10, 13, 5, 8], pred: 'T', note: '10 13 5 8 → Tài' },
    { pair: [5, 8, 14], pred: 'T', note: '5 8 14 → Tài' },
    { pair: [8, 14], pred: 'T', note: '8 14 → Tài' },
    { pair: [5, 8, 14, 17], pred: 'X', note: '5 8 14 17 → Xỉu' },
    { pair: [8, 14, 17], pred: 'X', note: '8 14 17 → Xỉu' },
    { pair: [17, 8], pred: 'T', note: '17 8 → Tài' },
    { pair: [17, 8, 13], pred: 'T', note: '17 8 13 → Tài' },
    { pair: [13, 17, 11], pred: 'X', note: '13 17 11 → Xỉu' },
    { pair: [17, 11, 10, 11], pred: 'X', note: '17 11 10 11 → Xỉu' },
    { pair: [11, 9, 13], pred: 'T', note: '11 9 13 → Tài' },
    { pair: [9, 13], pred: 'T', note: '9 13 → Tài' },
    { pair: [9, 13, 15], pred: 'X', note: '9 13 15 → Xỉu' },
    { pair: [13, 15], pred: 'X', note: '13 15 → Xỉu' },
    { pair: [15, 5], pred: 'X', note: '15 5 → Xỉu' },
    { pair: [13, 15, 5], pred: 'X', note: '13 15 5 → Xỉu' },
    { pair: [5, 10], pred: 'T', note: '5 10 → Tài' },
    { pair: [15, 5, 10], pred: 'X', note: '15 5 10 → Xỉu' },
    { pair: [8, 6], pred: 'T', note: '8 6 → Tài' },
    { pair: [10, 8, 6], pred: 'T', note: '10 8 6 → Tài' },
    { pair: [8, 6, 16], pred: 'X', note: '8 6 16 → Xỉu' },
    { pair: [6, 16], pred: 'X', note: '6 16 → Xỉu' },
    { pair: [16, 6], pred: 'X', note: '16 6 → Xỉu' },
    { pair: [6, 16, 6, 9], pred: 'T', note: '6 16 6 9 → Tài' },
    { pair: [16, 6, 9], pred: 'T', note: '16 6 9 → Tài' },
    { pair: [6, 9, 11], pred: 'T', note: '6 9 11 → Tài' },
    { pair: [9, 11], pred: 'T', note: '9 11 → Tài' },
    { pair: [9, 11, 13], pred: 'X', note: '9 11 13 → Xỉu' },
    { pair: [11, 13], pred: 'X', note: '11 13 → Xỉu' },
    { pair: [13, 10], pred: 'X', note: '13 10 → Xỉu' },
    { pair: [13, 10, 9], pred: 'T', note: '13 10 9 → Tài' },
    { pair: [14, 13], pred: 'X', note: '14 13 → Xỉu' },
    { pair: [9, 16], pred: 'X', note: '9 16 → Xỉu' },
    { pair: [10, 10], pred: 'T', note: '10 10 → Tài' },
    { pair: [7, 15, 11], pred: 'X', note: '7 15 11 → Xỉu' },
    { pair: [9, 16, 9], pred: 'X', note: '9 16 9 → Xỉu' },
    { pair: [16, 9, 9], pred: 'T', note: '16 9 9 → Tài' },
    { pair: [9, 9], pred: 'T', note: '9 9 → Tài' },
    { pair: [9, 9, 12], pred: 'T', note: '9 9 12 → Tài' },
    { pair: [9, 12, 12], pred: 'X', note: '9 12 12 → Xỉu' },
    { pair: [12, 5, 9], pred: 'X', note: '12 5 9 → Xỉu' },
    { pair: [5, 9], pred: 'T', note: '5 9 → Tài' },
    { pair: [5, 9, 9], pred: 'T', note: '5 9 9 → Tài' },
    { pair: [9, 9, 11], pred: 'X', note: '9 9 11 → Xỉu' },
    { pair: [9, 11], pred: 'X', note: '9 11 → Xỉu' },
    { pair: [11, 9, 12], pred: 'X', note: '11 9 12 → Xỉu' },
    { pair: [12, 8], pred: 'T', note: '12 8 → Tài' },
    { pair: [9, 12], pred: 'X', note: '9 12 → Xỉu' },
    { pair: [9, 12, 10], pred: 'X', note: '9 12 10 → Xỉu' },
    { pair: [12, 10, 8], pred: 'T', note: '12 10 8 → Tài' },
    { pair: [10, 8, 16], pred: 'X', note: '10 8 16 → Xỉu' },
    { pair: [16, 3], pred: 'T', note: '16 3 → Tài' },
    { pair: [3, 13, 8, 9, 8], pred: 'X', note: '3 13 8 9 8 → Xỉu' },
    { pair: [6, 14, 16], pred: 'X', note: '6 14 16 → Xỉu' },
    { pair: [16, 10], pred: 'T', note: '16 10 → Tài' },
    { pair: [16, 10, 11], pred: 'X', note: '16 10 11 → Xỉu' },
    { pair: [10, 15], pred: 'T', note: '10 15 → Tài' },
    { pair: [15, 10], pred: 'T', note: '15 10 → Tài' },
    { pair: [15, 10, 12], pred: 'X', note: '15 10 12 → Xỉu' },
    { pair: [10, 12, 7], pred: 'T', note: '10 12 7 → Tài' },
    { pair: [12, 7], pred: 'T', note: '12 7 → Tài' },
    { pair: [12, 6], pred: 'T', note: '12 6 → Tài' },
    { pair: [7, 12], pred: 'X', note: '7 12 → Xỉu' },
    { pair: [7, 12, 9], pred: 'X', note: '7 12 9 → Xỉu' },
    { pair: [7, 12, 9, 8], pred: 'T', note: '7 12 9 8 → Tài' },
    { pair: [4, 16], pred: 'T', note: '4 16 → Tài' },
    { pair: [16, 12], pred: 'X', note: '16 12 → Xỉu' },
    { pair: [16, 12, 7], pred: 'X', note: '16 12 7 → Xỉu' },
    { pair: [7, 8, 7], pred: 'T', note: '7 8 7 → Tài' },
    { pair: [14, 6], pred: 'X', note: '14 6 → Xỉu' },
    { pair: [11, 8], pred: 'T', note: '11 8 → Tài' },
    { pair: [10, 5], pred: 'T', note: '10 5 → Tài' },
    { pair: [5, 13, 12], pred: 'T', note: '5 13 12 → Tài' },
    { pair: [10, 5, 13, 12], pred: 'T', note: '10 5 13 12 → Tài' },
    { pair: [12, 18], pred: 'X', note: '12 18 → Xỉu' },
    { pair: [18, 10], pred: 'T', note: '18 10 → Tài' },
    { pair: [12, 9, 8], pred: 'T', note: '12 9 8 → Tài' },
    { pair: [15, 14, 13], pred: 'X', note: '15 xuống 14 13 → Xỉu' },
    { pair: [15, 17, 16], pred: 'T', note: '15 lên 17 16 → Tài' },
    { pair: [11, 13, 13], pred: 'X', note: '13 13 → Xỉu' },
    { pair: [14, 14], pred: 'T', note: '14 14 → Tài' },
    { pair: [12, 12], pred: 'T', note: '12 12 → Tài' },
    { pair: [5, 7], pred: 'X', note: '5 7 → Xỉu' },
    { pair: [6, 7], pred: 'T', note: '6 7 → Tài' },
    { pair: [12, 6], pred: 'T', note: '12 6 → Tài' },
    { pair: [11, 6], pred: 'X', note: '11 6 → Xỉu' },
    { pair: [15, 9], pred: 'T', note: '15 9 → Tài' },
    { pair: [11, 11], pred: 'T', note: '11 11 → Tài' },
    { pair: [12, 11], pred: 'T', note: '12 11 → Tài' },
    { pair: [13, 13, 14], pred: 'T', note: '13 13 14 → Tài' },
    { pair: [7, 17], pred: 'X', note: '7 17 → Xỉu' },
    { pair: [10, 17], pred: 'X', note: '10 17 → Xỉu' },
    { pair: [17, 17], pred: 'T', note: '17 17 → Tài' },
    { pair: [17, 18], pred: 'T', note: '17 18 → Tài' },
    { pair: [18], pred: 'T', note: '18 → Tài' },
    { pair: [9, 12], pred: 'X', note: '9 12 → Xỉu' },
    { pair: [8, 11], pred: 'X', note: '8 11 → Xỉu' },
    { pair: [11, 7], pred: 'X', note: '11 7 → Xỉu' },
    { pair: [10, 8], pred: 'X', note: '10 8 → Xỉu' },
    { pair: [10, 7], pred: 'X', note: '10 7 → Xỉu' },
    { pair: [10, 9], pred: 'T', note: '10 9 → Tài' },
    { pair: [9, 10], pred: 'T', note: '9 10 → Tài' },
    { pair: [14, 11], pred: 'T', note: '14 11 → Tài' },
    { pair: [8, 9], pred: 'X', note: '8 9 → Xỉu' },
    { pair: [9, 15], pred: 'X', note: '9 15 → Xỉu' },
    { pair: [15, 10], pred: 'X', note: '15 10 → Xỉu' },
    { pair: [7, 10], pred: 'T', note: '7 10 → Tài' },
    { pair: [8, 10], pred: 'T', note: '8 10 → Tài' },
    { pair: [10, 11], pred: 'X', note: '10 11 → Xỉu' },
    { pair: [11, 10], pred: 'T', note: '11 10 → Tài' },
    { pair: [14, 4], pred: 'X', note: '14 4 → Xỉu' },
    { pair: [13, 5], pred: 'X', note: '13 5 → Xỉu' },
    { pair: [12, 5], pred: 'T', note: '12 5 → Tài' },
    { pair: [11, 4], pred: 'X', note: '11 4 → Xỉu' },
    { pair: [10, 3], pred: 'X', note: '10 3 → Xỉu' },
    { pair: [9, 3], pred: 'X', note: '9 3 → Xỉu' },
    { pair: [6, 3], pred: 'X', note: '6 3 → Xỉu' },
    { pair: [3, 7], pred: 'T', note: '3 7 → Tài' },
    { pair: [3, 9], pred: 'T', note: '3 9 → Tài' },
    { pair: [3, 10], pred: 'T', note: '3 10 → Tài' },
    { pair: [4, 9], pred: 'T', note: '4 9 → Tài' },
    { pair: [5, 10], pred: 'T', note: '5 10 → Tài' },
    { pair: [6, 10], pred: 'T', note: '6 10 → Tài' },
    { pair: [7, 10], pred: 'T', note: '7 10 → Tài' },
    { pair: [11, 18], pred: 'T', note: '11 18 → Tài' },
    { pair: [15, 18], pred: 'T', note: '15 18 → Tài' },
    { pair: [9, 18], pred: 'T', note: '9 18 → Tài' },
    { pair: [13, 18], pred: 'T', note: '13 18 → Tài' },
    { pair: [13, 15], pred: 'T', note: '13 15 → Tài' },
    { pair: [14, 15], pred: 'T', note: '14 15 → Tài' },
    { pair: [11, 15], pred: 'X', note: '11 15 → Xỉu' },
    { pair: [15, 14], pred: 'X', note: '15 14 → Xỉu' },
    { pair: [15, 13], pred: 'X', note: '15 13 → Xỉu' },
];

function matchManualPattern(totals) {
    for (let pat of MANUAL_PATTERNS) {
        const p = pat.pair;
        if (p.length > totals.length) continue;
        let match = true;
        for (let i = 0; i < p.length; i++) {
            if (totals[totals.length - p.length + i] !== p[i]) {
                match = false;
                break;
            }
        }
        if (match) return { pred: pat.pred, note: pat.note, source: 'manual' };
    }
    return null;
}

// ============================================================
// DU_DOAN_JS - CẢI TIẾN VỚI PATTERN DB
// ============================================================
let PATTERN_MEMORY = {};
let ERROR_MEMORY = {};

function du_doan_js(data_kq, dem_sai, pattern_sai, xx, diem_lich_su, data_store) {
    try {
        let xx_list = [];
        if (typeof xx === 'string') xx_list = xx.split('-').map(s => s.trim());
        else if (Array.isArray(xx)) xx_list = xx.map(x => String(x));
        const tong = xx_list.reduce((s, x) => s + parseInt(x || 0), 0);
        data_kq = data_kq.map(x => x === 'Tài' || x === 'T' ? 'T' : (x === 'X' || x === 'Xỉu' ? 'X' : (x === 'Xiu' ? 'X' : x)));
        data_kq = data_kq.slice(-100);
        const cuoi = data_kq.length ? (data_kq[data_kq.length - 1]) : null;
        const pattern = data_kq.map(x => x === 'T' ? 'T' : 'X').join('');
        const pattern_memory = PATTERN_MEMORY || {};

        // ===== KIỂM TRA PATTERN DB - ƯU TIÊN CAO NHẤT =====
        const dbResult = predictByPatternDB(data_kq);
        if (dbResult.matched) {
            const score = Math.round(50 + dbResult.confidence * 50);
            return { 
                pred: dbResult.prediction, 
                score: Math.min(score, 99), 
                reason: `📊 ${dbResult.reason}`
            };
        }

        // ===== KIỂM TRA PATTERN MEMORY =====
        let matched_pattern = null,
            matched_confidence = 0,
            matched_pred = null;
        for (let pat in pattern_memory) {
            if (pattern.endsWith(pat)) {
                const stats = pattern_memory[pat];
                const count = stats.count || 0;
                const correct = stats.correct || 0;
                const confidence = count > 0 ? correct / count : 0;
                if (confidence > matched_confidence && count >= 3 && confidence >= 0.6) {
                    matched_confidence = confidence;
                    matched_pattern = pat;
                    matched_pred = stats.next_pred;
                }
            }
        }
        if (matched_pattern && matched_pred) {
            const score = 90 + Math.floor(matched_confidence * 10);
            return { pred: matched_pred === 'T' ? 'T' : 'X', score: Math.min(score, 99), reason: `Dự theo mẫu đã học '${matched_pattern}' tin cậy ${matched_confidence.toFixed(2)}` };
        }

        // ===== KIỂM TRA LỖI =====
        const error_memory = ERROR_MEMORY || {};
        if (data_kq.length >= 3) {
            const last3 = data_kq.slice(-3).join(',');
            if (error_memory[last3] && error_memory[last3] >= 2) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 89, reason: `AI tự học lỗi: mẫu ${last3} gây sai nhiều → đảo` };
            }
        }

        // ===== KIỂM TRA SAI LIÊN TIẾP =====
        if (dem_sai >= 4) {
            const du = cuoi === 'T' ? 'X' : 'T';
            return { pred: du, score: 87, reason: `Sai liên tiếp ${dem_sai} → đổi` };
        }

        // ===== KIỂM TRA CÂN BẰNG 5 PHIÊN =====
        if (data_kq.length >= 5) {
            const tail5 = data_kq.slice(-5);
            const countT = tail5.filter(x => 'T' === x).length;
            const countX = tail5.filter(x => 'X' === x).length;
            if (countT === countX && data_kq[data_kq.length - 1] !== data_kq[data_kq.length - 2]) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 88, reason: 'Phát hiện dấu hiệu đổi cầu → đổi hướng' };
            }
        }

        // ===== XỬ LÝ THEO SỐ LƯỢNG DỮ LIỆU =====
        if (data_kq.length < 1) {
            if (tong >= 16) return { pred: 'T', score: 98, reason: `Tay đầu tổng ${tong} >=16 → Tài` };
            if (tong <= 6) return { pred: 'X', score: 98, reason: `Tay đầu tổng ${tong} <=6 → Xỉu` };
            return { pred: tong >= 11 ? 'T' : 'X', score: 75, reason: `Tay đầu → Dựa tổng ${tong}` };
        }

        if (data_kq.length == 1) {
            if (tong >= 16) return { pred: 'T', score: 98, reason: `Tay 2 tổng ${tong} >=16 → Tài` };
            if (tong <= 6) return { pred: 'X', score: 98, reason: `Tay 2 tổng ${tong} <=6 → Xỉu` };
            const du = cuoi === 'T' ? 'X' : 'T';
            return { pred: du, score: 80, reason: `Tay 2 → dự đoán ngược (${cuoi})` };
        }

        // ===== TÍNH RUN LENGTH =====
        const ben = (() => {
            if (!data_kq.length) return 0;
            const lastVal = data_kq[data_kq.length - 1];
            let run = 1;
            for (let i = data_kq.length - 2; i >= 0; i--) {
                if (data_kq[i] === lastVal) run++;
                else break;
            }
            return run;
        })();

        // ===== ĐẾM TỔNG =====
        const countsObj = { T: data_kq.filter(x => 'T' === x).length, X: data_kq.filter(x => 'X' === x).length };
        const chenh = Math.abs(countsObj.T - countsObj.X);

        // ===== XỬ LÝ DIEM_LICH_SU =====
        diem_lich_su = diem_lich_su || [];
        diem_lich_su.push(tong);
        if (diem_lich_su.length > 6) diem_lich_su.shift();

        // ===== KIỂM TRA CẦU BỆT-BỆT =====
        if (pattern.length >= 9) {
            for (let i = 4; i <= 6; i++) {
                if (pattern.length >= i * 2) {
                    const sub1 = pattern.slice(-i * 2, -i);
                    const sub2 = pattern.slice(-i);
                    if (sub1 === 'T'.repeat(i) && sub2 === 'X'.repeat(i)) return { pred: 'X', score: 90, reason: `Phát hiện cầu bệt-bệt ${sub1 + sub2}` };
                    if (sub1 === 'X'.repeat(i) && sub2 === 'T'.repeat(i)) return { pred: 'T', score: 90, reason: `Phát hiện cầu bệt-bệt ${sub1 + sub2}` };
                }
            }
        }

        // ===== KIỂM TRA ĐIỂM LẶP =====
        if (diem_lich_su.length >= 3 && (new Set(diem_lich_su.slice(-3))).size === 1) {
            return { pred: (tong % 2 === 1) ? 'T' : 'X', score: 96, reason: `3 lần lặp điểm: ${tong}` };
        }

        if (diem_lich_su.length >= 2 && diem_lich_su[diem_lich_su.length - 1] === diem_lich_su[diem_lich_su.length - 2]) {
            return { pred: (tong % 2 === 0) ? 'T' : 'X', score: 94, reason: `Kép điểm: ${tong}` };
        }

        // ===== KIỂM TRA 3 XÚC XẮC GIỐNG NHAU =====
        if (xx_list.length === 3 && xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
            const so = xx_list[0];
            if (['1', '2', '4'].includes(so)) return { pred: 'X', score: 97, reason: `3 xúc xắc ${so} → Xỉu` };
            if (['3', '5'].includes(so)) return { pred: 'T', score: 97, reason: `3 xúc xắc ${so} → Tài` };
            if (so === '6' && ben >= 3) return { pred: 'T', score: 97, reason: '3 xúc xắc 6 + bệt → Tài' };
        }

        // ===== XỬ LÝ BỆT =====
        if (ben >= 3) {
            if (cuoi === 'T') {
                if (ben >= 5 && !xx_list.includes('3')) {
                    if (!data_store.da_be_tai) { data_store.da_be_tai = true; return { pred: 'X', score: 80, reason: '⚠️ Bệt Tài ≥5 chưa có xx3 → Bẻ thử' } }
                    else return { pred: 'T', score: 90, reason: 'Ôm tiếp bệt Tài chờ xx3' };
                } else if (xx_list.includes('3')) {
                    data_store.da_be_tai = false;
                    return { pred: 'X', score: 95, reason: 'Bệt Tài + Xí ngầu 3 → Bẻ' };
                }
            } else {
                if (ben >= 5 && !xx_list.includes('5')) {
                    if (!data_store.da_be_xiu) { data_store.da_be_xiu = true; return { pred: 'T', score: 80, reason: '⚠️ Bệt Xỉu ≥5 chưa có xx5 → Bẻ thử' } }
                    else return { pred: 'X', score: 90, reason: 'Ôm tiếp bệt Xỉu chờ xx5' };
                } else if (xx_list.includes('5')) {
                    data_store.da_be_xiu = false;
                    return { pred: 'T', score: 95, reason: 'Bệt Xỉu + Xí ngầu 5 → Bẻ' };
                }
            }
            return { pred: cuoi, score: 93, reason: `Bệt ${cuoi} (${ben} tay)` };
        }

        // ===== KIỂM TRA CÁC MẪU CẦU CỔ ĐIỂN =====
        const ends = (pats) => pats.some(p => pattern.endsWith(p));
        const cau_mau = {
            "1-1": ["TXTX", "XTXT", "TXTXT", "XTXTX"],
            "2-2": ["TTXXTT", "XXTTXX"],
            "3-3": ["TTTXXX", "XXXTTT"],
            "1-2-3": ["TXXTTT", "XTTXXX"],
            "3-2-1": ["TTTXXT", "XXXTTX"],
            "1-2-1": ["TXXT", "XTTX"],
            "2-1-1-2": ["TTXTXX", "XXTXTT"],
            "2-1-2": ["TTXTT", "XXTXX"],
            "3-1-3": ["TTTXTTT", "XXXTXXX"],
            "1-2": ["TXX", "XTT"],
            "2-1": ["TTX", "XXT"],
            "1-3-2": ["TXXXTT", "XTTTXX"],
            "1-2-4": ["TXXTTTT", "XTTXXXX"],
            "1-5-3": ["TXXXXXTTT", "XTTTTXXX"],
            "7-4-2": ["TTTTTTTXXXXTT", "XXXXXXXTTTTXX"],
            "4-2-1-3": ["TTTTXXTXXX", "XXXXTTXTTT"],
            "1-4-2": ["TXXXXTT", "XTTTTXX"],
            "5-1-3": ["TTTTXTTT", "XXXXXTXXX"]
        };

        for (let loai in cau_mau) {
            const arr = cau_mau[loai];
            if (arr.some(a => pattern.endsWith(a))) {
                return { pred: cuoi === 'T' ? 'X' : 'T', score: 90, reason: `Phát hiện cầu ${loai}` };
            }
        }

        // ===== KIỂM TRA CẦU 1-1 =====
        if (data_kq.length >= 6) {
            const last6 = data_kq.slice(-6);
            for (let i = 2; i < 6; i++) {
                if (i * 2 <= last6.length) {
                    const seq = last6.slice(-i * 2);
                    const alt1 = [], alt2 = [];
                    for (let j = 0; j < i * 2; j++) { alt1.push(j % 2 === 0 ? 'T' : 'X'); alt2.push(j % 2 === 0 ? 'X' : 'T'); }
                    if (seq.join('') === alt1.join('') || seq.join('') === alt2.join('')) {
                        return { pred: (cuoi === 'X') ? 'T' : 'X', score: 90, reason: `Bẻ cầu 1-1 (${i * 2} tay)` };
                    }
                }
            }
        }

        // ===== KIỂM TRA SAI 3 LẦN =====
        if (dem_sai >= 3) return { pred: cuoi === 'T' ? 'X' : 'T', score: 88, reason: 'Sai 3 lần → Đổi chiều' };

        // ===== KIỂM TRA MẪU SAI CŨ =====
        if (data_kq.length >= 3 && pattern_sai.hasOwnProperty(data_kq.slice(-3).join(','))) {
            return { pred: cuoi === 'T' ? 'X' : 'T', score: 86, reason: 'Mẫu sai cũ' };
        }

        // ===== KIỂM TRA LỆCH CẦU =====
        if (chenh >= 3) {
            const uu = countsObj.T > countsObj.X ? 'T' : 'X';
            return { pred: uu, score: 84, reason: `Lệch ${chenh} cầu → Ưu tiên ${uu}` };
        }

        // ============================================================
        // KHI KHÔNG CÓ MẪU - SỬ DỤNG THUẬT TOÁN DỰ PHÒNG
        // ============================================================
        
        // 1. Dựa trên tổng điểm
        if (tong >= 11 && tong <= 18) {
            const score = 60 + (tong - 10) * 3;
            return { pred: 'T', score: Math.min(score, 95), reason: `Tổng ${tong} → nghiêng Tài (${Math.min(score, 95)}%)` };
        }
        if (tong >= 3 && tong <= 10) {
            const score = 60 + (11 - tong) * 3;
            return { pred: 'X', score: Math.min(score, 95), reason: `Tổng ${tong} → nghiêng Xỉu (${Math.min(score, 95)}%)` };
        }

        // 2. Dựa trên xu hướng 3 phiên gần nhất
        if (data_kq.length >= 3) {
            const last3 = data_kq.slice(-3);
            const tCount = last3.filter(x => x === 'T').length;
            const xCount = last3.filter(x => x === 'X').length;
            if (tCount > xCount) {
                return { pred: 'T', score: 65, reason: `3 phiên gần: ${tCount}T-${xCount}X → theo Tài` };
            } else if (xCount > tCount) {
                return { pred: 'X', score: 65, reason: `3 phiên gần: ${tCount}T-${xCount}X → theo Xỉu` };
            }
        }

        // 3. Dựa trên trung bình điểm lịch sử
        if (diem_lich_su.length >= 3) {
            const avg = diem_lich_su.reduce((a, b) => a + b, 0) / diem_lich_su.length;
            if (avg >= 11) {
                return { pred: 'T', score: 68, reason: `TB điểm ${avg.toFixed(1)} ≥ 11 → Tài` };
            } else {
                return { pred: 'X', score: 68, reason: `TB điểm ${avg.toFixed(1)} < 11 → Xỉu` };
            }
        }

        // 4. Dựa trên so sánh với phiên trước
        if (data_kq.length >= 2) {
            const prev = data_kq[data_kq.length - 2];
            if (prev !== cuoi && cuoi !== null) {
                return { pred: cuoi === 'T' ? 'X' : 'T', score: 70, reason: `Đổi cầu từ ${prev} → ${cuoi === 'T' ? 'X' : 'T'}` };
            }
        }

        // 5. Mặc định: ưu tiên Tài nếu không có dữ liệu
        return { pred: 'T', score: 55, reason: 'Không đủ dữ liệu → ưu tiên Tài (55%)' };

    } catch (e) {
        return { pred: 'T', score: 50, reason: 'Lỗi trong du_doan_js: ' + (e.message || e) };
    }
}

// ============================================================
// CLASSIFY ROAD
// ============================================================
function classifyRoad(seq) {
    const cShort = counts(last(seq, 12));
    const rateT = cShort.T / (cShort.T + cShort.X || 1);
    const r = computeRunLength(seq);
    const tail = last(seq, 6).join('');
    if (/^([TX])([TX])\1\2\1\2$/.test(tail)) return 'zigzag';
    if (r.run >= 6) return 'streaky';
    if (Math.abs(rateT - 0.5) < 0.08) return 'flat';
    if (rateT > 0.6) return 'trending_T';
    if (rateT < 0.4) return 'trending_X';
    return 'mixed';
}

// ============================================================
// PREDICTOR SERVICE
// ============================================================
class PredictorService {
    constructor(history) {
        this.history = history || [];
        this.ensemble = new Ensemble();
        this.ensemble.trainAll(seqFromHistory(this.history));
        this.predHistory = [];
        this.data_store = {};
        this.dem_sai = 0;
        this.pattern_sai = {};
        this.diem_lich_su = [];
    }
    predict() {
        const seq = seqFromHistory(this.history);
        const totals = this.history.map(h => {
            if (h.Tong !== undefined) return h.Tong;
            if (h.tong !== undefined) return h.tong;
            if (h.total !== undefined) return h.total;
            return null;
        }).filter(x => x !== null);
        const roadType = classifyRoad(seq);
        const modelOut = this.ensemble.predictProba(seq);
        const top = Math.max(modelOut.distribution.T, modelOut.distribution.X);
        const entropy = -(modelOut.distribution.T * Math.log2(modelOut.distribution.T + 1e-9) + modelOut.distribution.X * Math.log2(modelOut.distribution.X + 1e-9));
        const weightEntropy = -Object.values(this.ensemble.weights).reduce((s, w) => s + w * Math.log2(w + 1e-9), 0);
        const weightConcentration = 1 - (weightEntropy / Math.log2(CONFIG.MODELS.length));
        const conf = clamp(CONFIG.BASE_CONFIDENCE * 0.3 + top * 0.6 + weightConcentration * 0.1 - (entropy * 0.05), 0, 1);
        const predicted = modelOut.distribution.T >= modelOut.distribution.X ? 'T' : 'X';
        const reasonPieces = [];
        const modelScores = {};
        CONFIG.MODELS.forEach(m => {
            const p = modelOut.modelProbas[m][predicted];
            modelScores[m] = (this.ensemble.weights[m] || 0) * p;
        });
        const topModel = Object.keys(modelScores).reduce((a, b) => modelScores[a] > modelScores[b] ? a : b);
        reasonPieces.push(`Top model: ${topModel} (w=${(this.ensemble.weights[topModel] || 0).toFixed(3)})`);
        reasonPieces.push(`Road type: ${roadType}`);
        const runInfo = computeRunLength(seq);
        reasonPieces.push(`Run: ${runInfo.run} of ${runInfo.value || '-'}`);
        const pat = this.ensemble.models.pattern.detectPattern(seq);
        if (pat.type !== 'none') reasonPieces.push(`Pattern detected: ${pat.type} (str=${pat.strength.toFixed(2)})`);
        if (runInfo.run >= CONFIG.RUN_WINDOW_SHORT) reasonPieces.push('Long run → tăng khả năng bẻ');
        else reasonPieces.push('Short run/mixed → momentum ủng hộ tiếp tục');
        const manual = matchManualPattern(totals);
        let manualObj = null;
        if (manual) {
            manualObj = { pred: manual.pred, note: manual.note, weight: 0.9 };
            reasonPieces.push(`Manual pattern matched: ${manual.note}`);
        }

        const last = this.history.length ? this.history[this.history.length - 1] : null;
        const xx_str = last && last.Xuc_xac_1 ? `${last.Xuc_xac_1}-${last.Xuc_xac_2}-${last.Xuc_xac_3}` : (last && last.xi ? last.xi : (last && last.xuc_xac_1 ? `${last.xuc_xac_1}-${last.xuc_xac_2}-${last.xuc_xac_3}` : ''));
        const human_seq_labels = this.history.map(h => {
            if (h.Ket_qua) return h.Ket_qua === 'Tài' ? 'T' : 'X';
            if (h.ket_qua) return h.ket_qua === 'Tài' ? 'T' : 'X';
            if (h.result) return h.result === 'T' ? 'T' : 'X';
            return null;
        }).filter(x => x);
        const duObj = du_doan_js(human_seq_labels, this.dem_sai, this.pattern_sai, xx_str, this.diem_lich_su, this.data_store);

        const ensembleProb = modelOut.distribution;
        const ensemblePred = ensembleProb.T >= ensembleProb.X ? 'T' : 'X';

        let weights = { ensemble: 0.45, du: 0.35, manual: 0.20 };
        if (manualObj) {
            weights.manual = 0.4;
            weights.ensemble = 0.35;
            weights.du = 0.25;
        }
        const scoreT = weights.ensemble * ensembleProb.T + weights.du * (duObj.pred === 'T' ? duObj.score / 100 : (100 - duObj.score) / 100) + (manualObj ? (weights.manual * (manualObj.pred === 'T' ? manualObj.weight : (1 - manualObj.weight))) : 0);
        const scoreX = weights.ensemble * ensembleProb.X + weights.du * (duObj.pred === 'X' ? duObj.score / 100 : (100 - duObj.score) / 100) + (manualObj ? (weights.manual * (manualObj.pred === 'X' ? manualObj.weight : (1 - manualObj.weight))) : 0);
        const norm = scoreT + scoreX || 1;
        const finalT = scoreT / norm;
        const finalX = scoreX / norm;
        const finalPred = finalT >= finalX ? 'T' : 'X';
        const finalConf = clamp(Math.max(finalT, finalX), 0, 1);

        const reason = [
            `Ensemble: ${ensemblePred} (pT=${ensembleProb.T.toFixed(3)}, pX=${ensembleProb.X.toFixed(3)})`,
            `du_doan: ${duObj.pred} (score=${duObj.score}) - ${duObj.reason}`,
            manualObj ? `Manual: ${manualObj.pred} (${manualObj.note})` : null,
            `Fusion weights: ensemble=${weights.ensemble}, du=${weights.du}, manual=${weights.manual || 0}`,
            `Final fusion: pT=${finalT.toFixed(3)}, pX=${finalX.toFixed(3)}`
        ].filter(x => x).join(' | ');

        return {
            timestamp: nowStr(),
            prediction: finalPred === 'T' ? 'Tài' : 'Xỉu',
            confidence: Math.round(finalConf * 10000) / 100,
            distribution: { T: finalT, X: finalX },
            ensemble: modelOut,
            du_doan: duObj,
            manual: manualObj,
            reason,
            roadType,
            runInfo,
            history_len: this.history.length,
            last_round: last
        };
    }

    learn(actualRound) {
        this.history.push(actualRound);
        this.ensemble.trainAll(seqFromHistory(this.history));
        const seqBefore = seqFromHistory(this.history.slice(0, -1));
        const actual = actualRound.Ket_qua ? (actualRound.Ket_qua === 'Tài' ? 'T' : 'X') : (actualRound.ket_qua ? (actualRound.ket_qua === 'Tài' ? 'T' : 'X') : 'X');
        this.ensemble.updateWeights(seqBefore, actual);
    }
}

// ============================================================
// KHỞI TẠO PREDICTOR
// ============================================================
let predictor = new PredictorService([]);
let lastPhien = null;
let isProcessing = false;
let latestRound = null;
let latestPrediction = null;

// ============================================================
// GỌI API
// ============================================================
async function fetchAndPredict() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const response = await fetch(CONFIG.API_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            }
        });

        if (!response.ok) {
            isProcessing = false;
            return;
        }

        const obj = await response.json();

        const round = {
            Phien: obj.phien || obj.Phien || null,
            Xuc_xac_1: obj.xuc_xac_1 || obj.Xuc_xac_1 || 0,
            Xuc_xac_2: obj.xuc_xac_2 || obj.Xuc_xac_2 || 0,
            Xuc_xac_3: obj.xuc_xac_3 || obj.Xuc_xac_3 || 0,
            Tong: obj.tong || obj.Tong || 0,
            Ket_qua: obj.ket_qua || obj.Ket_qua || null
        };

        if (round.Phien && round.Phien !== lastPhien && round.Xuc_xac_1 > 0) {
            if (round.Tong === 0) {
                round.Tong = round.Xuc_xac_1 + round.Xuc_xac_2 + round.Xuc_xac_3;
            }

            lastPhien = round.Phien;
            latestRound = round;

            try { predictor.learn(round); } catch (e) { /* ignore */ }

            try { latestPrediction = predictor.predict(); } catch (e) { /* ignore */ }
        }
    } catch (error) {
        // Silent fail
    }

    isProcessing = false;
}

// ============================================================
// EXPRESS ROUTES
// ============================================================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'API Predictor is running',
        time: new Date().toISOString(),
        keepAlive: keepAliveCount
    });
});

// Endpoint lấy dự đoán mới nhất
app.get('/predict', (req, res) => {
    if (!latestRound || !latestPrediction) {
        return res.json({
            status: 'waiting',
            message: 'Chưa có dữ liệu, đang chờ phiên mới...',
            time: new Date().toISOString()
        });
    }

    const exportObj = {
        Phien: latestRound.Phien,
        Xuc_xac1: latestRound.Xuc_xac_1,
        Xuc_xac2: latestRound.Xuc_xac_2,
        Xuc_xac3: latestRound.Xuc_xac_3,
        Tong: latestRound.Tong,
        Ketqua: latestRound.Ket_qua || 'Chưa có',
        Du_doan: latestPrediction.prediction || null,
        cre: CONFIG.CREATOR_ID,
        meta: {
            timestamp: new Date().toISOString(),
            reason: latestPrediction.reason || 'Không có lý do',
            confidence: latestPrediction.confidence || 0
        }
    };

    res.json(exportObj);
});

// Endpoint lấy lịch sử
app.get('/history', (req, res) => {
    const history = predictor.history.slice(-30).map(h => ({
        Phien: h.Phien,
        Xuc_xac1: h.Xuc_xac_1,
        Xuc_xac2: h.Xuc_xac_2,
        Xuc_xac3: h.Xuc_xac_3,
        Tong: h.Tong,
        Ketqua: h.Ket_qua
    }));
    res.json({
        total: predictor.history.length,
        history: history
    });
});

// Endpoint lấy tất cả dự đoán đã lưu
app.get('/all-predictions', (req, res) => {
    const predictions = predictor.predHistory || [];
    res.json({
        total: predictions.length,
        predictions: predictions.slice(-50)
    });
});

// ============================================================
// START
// ============================================================
console.log('🚀 API Predictor started');
console.log(`📡 API: ${CONFIG.API_URL}`);
console.log(`⏱️ Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
console.log(`👤 Creator: ${CONFIG.CREATOR_ID}`);
console.log(`📊 Endpoints:`);
console.log(`   /              - Health check`);
console.log(`   /predict       - Dự đoán mới nhất`);
console.log(`   /history       - Lịch sử 30 phiên`);
console.log(`   /all-predictions - Tất cả dự đoán đã lưu`);
console.log('─────────────────────────────');
console.log('📚 PATTERN DB loaded: ' + Object.keys(PATTERN_DB).length + ' patterns');

// Chạy polling
setTimeout(fetchAndPredict, 1000);
setInterval(fetchAndPredict, CONFIG.POLL_INTERVAL);

// Start server
app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
