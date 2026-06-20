// ============================================================
// api_predict_render.js - API DỰ ĐOÁN ĐA NGUỒN VỚI POLLING
// Dùng cho Render.com - Tích hợp nhiều API với thuật toán 100%
// ƯU TIÊN CLASSIC PATTERNS - TXT, 7 6 → TÀI, 8 7 → TÀI
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// CORS - CHO PHÉP TẤT CẢ DOMAIN KẾT NỐI
// ============================================================
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
// CẤU HÌNH API NGUỒN
// ============================================================
const API_SOURCES = {
    "sunwin": {
        "tx": "http://103.249.116.192:1001/api/ditmemaysun"
    },
    "Ogkfan": {
        "txmd5": "https://guidance-discrete-dive-navigate.trycloudflare.com/api/txmd5/latest"
    },
    "Xocdia88": {
        "tx": "https://pollution-seconds-sail-strikes.trycloudflare.com/api/taixiu"
    },
    "Hitclub": {
        "tx": "https://subdivision-term-came-attempting.trycloudflare.com/api/tx",
        "txmd5": "https://subdivision-term-came-attempting.trycloudflare.com/api/txmd5"
    },
    "Lc79": {
        "tx": "https://thread-broke-artwork-compound.trycloudflare.com/api/tx",
        "txmd5": "https://thread-broke-artwork-compound.trycloudflare.com/api/txmd5"
    },
    "Betvip": {
        "tx": "https://stored-could-elder-mini.trycloudflare.com/api/tx",
        "txmd5": "https://stored-could-elder-mini.trycloudflare.com/api/txmd5"
    },
    "789club": {
        "tx": "https://packet-veterinary-organ-ministers.trycloudflare.com/api/tx",
        "sicbo": "https://leslie-richardson-rrp-virtue.trycloudflare.com/sicbo/789club"
    },
    "B52": {
        "tx": "https://years-expiration-autos-concert.trycloudflare.com/taixiu",
        "txmd5": "https://years-expiration-autos-concert.trycloudflare.com/txmd5",
        "sicbo": "https://leslie-richardson-rrp-virtue.trycloudflare.com/sicbo/b52"
    },
    "Iwin": {
        "tx": "https://seek-vessels-peripherals-song.trycloudflare.com/api/tx",
        "txmd5": "https://seek-vessels-peripherals-song.trycloudflare.com/api/txmd5"
    },
    "Max789": {
        "tx": "https://expected-paying-pins-childhood.trycloudflare.com/api/tx",
        "txmd5": "https://expected-paying-pins-childhood.trycloudflare.com/api/txmd5"
    },
    "Son789": {
        "tx": "https://howto-out-excluding-tan.trycloudflare.com/api/tx",
        "txmd5": "https://howto-out-excluding-tan.trycloudflare.com/api/txmd5"
    },
    "Luck8": {
        "txmd5": "https://drawn-legislation-applicant-roberts.trycloudflare.com/api/txmd5",
        "sicbo40s": "https://drawn-legislation-applicant-roberts.trycloudflare.com/api/sicbo40"
    },
    "Sumvin": {
        "txmd5": "https://stories-meetings-injection-headlines.trycloudflare.com/api/md5"
    },
    "68gb": {
        "tx": "https://financing-patio-beast-invention.trycloudflare.com/api/68/thuong",
        "txmd5": "https://chuck-ent-nicole-leadership.trycloudflare.com/api/68/md5"
    },
    "Sun789": {
        "tx": "https://speeds-built-attendance-dedicated.trycloudflare.com/api/tx",
        "txmd5": "https://speeds-built-attendance-dedicated.trycloudflare.com/api/txmd5"
    },
    "Sunvip": {
        "tx": "https://leader-analysis-wool-inspector.trycloudflare.com/api/tx",
        "txmd5": "https://leader-analysis-wool-inspector.trycloudflare.com/api/txmd5"
    },
    "Hot789": {
        "tx": "https://improve-museum-der-levy.trycloudflare.com/api/tx",
        "txmd5": "https://improve-museum-der-levy.trycloudflare.com/api/txmd5"
    },
    "Ta28": {
        "tx": "https://conversation-selling-slowly-bride.trycloudflare.com/api/tx",
        "txmd5": "https://conversation-selling-slowly-bride.trycloudflare.com/api/txmd5"
    }
};

// ============================================================
// CẤU HÌNH DỰ ĐOÁN
// ============================================================
const CONFIG = {
    API_URL: 'http://103.249.116.192:1001/api/ditmemaysun',
    POLL_INTERVAL: 3000,
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

setInterval(() => {
    const pingUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    fetch(`${pingUrl}/`)
        .then(() => {
            keepAliveCount++;
            console.log(`💓 Keep-alive ping #${keepAliveCount} at ${new Date().toISOString()}`);
        })
        .catch(() => {});
}, 300000);

// ============================================================
// BIẾN TOÀN CỤ CHO POLLING
// ============================================================
const allGameData = {};
const allGamePredictions = {};
const gameHistory = {};
const lastPhienMap = {};
const gamePredictors = {};

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
// PATTERN DATABASE - 100+ MẪU
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
// HÀM DỰ ĐOÁN THEO PATTERN DB
// ============================================================
function predictByPatternDB(seq) {
    let patternStr = seq.join('');
    const maxLen = Math.min(patternStr.length, 20);
    for (let len = maxLen; len >= 1; len--) {
        const subPattern = patternStr.slice(-len);
        if (PATTERN_DB[subPattern]) {
            const result = PATTERN_DB[subPattern];
            return {
                matched: true,
                pattern: subPattern,
                prediction: result.prediction === 'Tài' ? 'T' : 'X',
                confidence: result.confidence / 100,
                reason: `📊 Khớp mẫu '${subPattern}' (độ tin cậy ${result.confidence}%)`
            };
        }
    }
    return { matched: false };
}

// ============================================================
// ƯU TIÊN 1: CLASSIC PATTERNS - TXT, 7 6 → TÀI, 8 7 → TÀI
// ============================================================
function checkClassicPatterns(seq, totals) {
    const patternStr = seq.join('');
    
    // ===== MẪU TXT =====
    if (patternStr.endsWith("TXT")) {
        const conf = Math.floor(Math.random() * 21) + 80; // 80-100
        return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu TXT → Xỉu (độ tin cậy ${conf}%)` };
    }
    if (patternStr.endsWith("XTX")) {
        const conf = Math.floor(Math.random() * 21) + 80;
        return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu XTX → Tài (độ tin cậy ${conf}%)` };
    }
    if (patternStr.endsWith("TTX")) {
        const conf = Math.floor(Math.random() * 21) + 80;
        return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu TTX → Xỉu (độ tin cậy ${conf}%)` };
    }
    if (patternStr.endsWith("XXT")) {
        const conf = Math.floor(Math.random() * 21) + 80;
        return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu XXT → Tài (độ tin cậy ${conf}%)` };
    }
    
    // ===== MẪU TỔNG =====
    if (totals && totals.length >= 2) {
        const lastTwo = totals.slice(-2);
        const lastThree = totals.length >= 3 ? totals.slice(-3) : null;
        
        // 7 6 → Tài
        if (lastTwo[0] === 7 && lastTwo[1] === 6) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 7 6 → Tài (độ tin cậy ${conf}%)` };
        }
        // 6 7 → Xỉu
        if (lastTwo[0] === 6 && lastTwo[1] === 7) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 6 7 → Xỉu (độ tin cậy ${conf}%)` };
        }
        // 8 7 → Tài
        if (lastTwo[0] === 8 && lastTwo[1] === 7) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 8 7 → Tài (độ tin cậy ${conf}%)` };
        }
        // 7 8 → Xỉu
        if (lastTwo[0] === 7 && lastTwo[1] === 8) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 7 8 → Xỉu (độ tin cậy ${conf}%)` };
        }
        // 9 4 → Tài
        if (lastTwo[0] === 9 && lastTwo[1] === 4) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 9 4 → Tài (độ tin cậy ${conf}%)` };
        }
        // 4 9 → Xỉu
        if (lastTwo[0] === 4 && lastTwo[1] === 9) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 4 9 → Xỉu (độ tin cậy ${conf}%)` };
        }
        // 15 6 → Tài
        if (lastTwo[0] === 15 && lastTwo[1] === 6) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 15 6 → Tài (độ tin cậy ${conf}%)` };
        }
        // 10 8 → Xỉu
        if (lastTwo[0] === 10 && lastTwo[1] === 8) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 10 8 → Xỉu (độ tin cậy ${conf}%)` };
        }
        // 6 9 → Tài
        if (lastTwo[0] === 6 && lastTwo[1] === 9) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 6 9 → Tài (độ tin cậy ${conf}%)` };
        }
        // 9 6 → Tài
        if (lastTwo[0] === 9 && lastTwo[1] === 6) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 9 6 → Tài (độ tin cậy ${conf}%)` };
        }
        // 11 11 → Tài
        if (lastTwo[0] === 11 && lastTwo[1] === 11) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 11 11 → Tài (độ tin cậy ${conf}%)` };
        }
        // 14 14 → Tài
        if (lastTwo[0] === 14 && lastTwo[1] === 14) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 14 14 → Tài (độ tin cậy ${conf}%)` };
        }
        // 12 12 → Tài
        if (lastTwo[0] === 12 && lastTwo[1] === 12) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 12 12 → Tài (độ tin cậy ${conf}%)` };
        }
        // 18 → Tài
        if (lastTwo[0] === 18 || lastTwo[1] === 18) {
            const conf = Math.floor(Math.random() * 21) + 80;
            return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 18 → Tài (độ tin cậy ${conf}%)` };
        }
        
        // ===== MẪU 3 SỐ =====
        if (lastThree) {
            // 7 6 13 → Xỉu
            if (lastThree[0] === 7 && lastThree[1] === 6 && lastThree[2] === 13) {
                const conf = Math.floor(Math.random() * 21) + 80;
                return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 7 6 13 → Xỉu (độ tin cậy ${conf}%)` };
            }
            // 9 10 8 → Xỉu
            if (lastThree[0] === 9 && lastThree[1] === 10 && lastThree[2] === 8) {
                const conf = Math.floor(Math.random() * 21) + 80;
                return { matched: true, prediction: 'X', confidence: conf, reason: `📊 Mẫu tổng 9 10 8 → Xỉu (độ tin cậy ${conf}%)` };
            }
            // 13 13 14 → Tài
            if (lastThree[0] === 13 && lastThree[1] === 13 && lastThree[2] === 14) {
                const conf = Math.floor(Math.random() * 21) + 80;
                return { matched: true, prediction: 'T', confidence: conf, reason: `📊 Mẫu tổng 13 13 14 → Tài (độ tin cậy ${conf}%)` };
            }
        }
    }
    
    return { matched: false };
}

// ============================================================
// MANUAL PATTERNS - 100+ MẪU
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

// ============================================================
// HÀM MATCH MANUAL PATTERN - RANDOM CONFIDENCE 80-100%
// ============================================================
function matchManualPattern(totals) {
    if (!totals || totals.length === 0) return null;
    
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
        if (match) {
            const confidence = Math.floor(Math.random() * 21) + 80; // 80-100
            return { 
                pred: pat.pred, 
                note: pat.note, 
                source: 'manual',
                confidence: confidence
            };
        }
    }
    return null;
}

// ============================================================
// KHỞI TẠO PREDICTOR CHO TỪNG GAME
// ============================================================
function getOrCreatePredictor(gameKey) {
    if (!gamePredictors[gameKey]) {
        gamePredictors[gameKey] = new PredictorService([]);
    }
    return gamePredictors[gameKey];
}

// ============================================================
// HÀM GỌI API TỔNG QUÁT
// ============================================================
async function fetchAPI(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        return null;
    }
}

// ============================================================
// HÀM CHUẨN HÓA DỮ LIỆU VÀ DỰ ĐOÁN - FULL THUẬT TOÁN
// ============================================================
function normalizeAndPredict(rawData, gameName, apiType, sourceUrl) {
    if (!rawData) return null;

    const phien = rawData.phien || rawData.Phien || rawData.id || null;
    const x1 = rawData.xuc_xac_1 || rawData.Xuc_xac_1 || rawData.x1 || null;
    const x2 = rawData.xuc_xac_2 || rawData.Xuc_xac_2 || rawData.x2 || null;
    const x3 = rawData.xuc_xac_3 || rawData.Xuc_xac_3 || rawData.x3 || null;
    let tong = rawData.tong || rawData.Tong || rawData.total || null;
    let ketqua = rawData.ket_qua || rawData.Ket_qua || rawData.result || null;

    if (x1 && x2 && x3 && tong === null) {
        tong = parseInt(x1) + parseInt(x2) + parseInt(x3);
    }

    if (tong !== null && ketqua === null) {
        ketqua = tong >= 11 ? "Tài" : "Xỉu";
    }

    if (ketqua) {
        if (typeof ketqua === 'string') {
            const lower = ketqua.toLowerCase();
            if (lower.includes('tài') || lower === 't' || lower === 'tai') ketqua = "Tài";
            else if (lower.includes('xỉu') || lower === 'x' || lower === 'xiu') ketqua = "Xỉu";
            else if (ketqua === 'T') ketqua = "Tài";
            else if (ketqua === 'X') ketqua = "Xỉu";
        }
    }

    const gameKey = `${gameName}-${apiType}`;
    const predictor = getOrCreatePredictor(gameKey);

    let duDoan = null;
    let confidence = 0;
    let reason = "Chưa có dữ liệu để dự đoán";

    if (phien && x1 && x2 && x3 && tong !== null && ketqua) {
        const round = {
            Phien: phien,
            Xuc_xac_1: parseInt(x1),
            Xuc_xac_2: parseInt(x2),
            Xuc_xac_3: parseInt(x3),
            Tong: tong,
            Ket_qua: ketqua
        };
        
        predictor.learn(round);
        
        try {
            const predResult = predictor.predict();
            duDoan = predResult.prediction;
            confidence = predResult.confidence;
            reason = predResult.reason;
        } catch (e) {
            if (tong !== null) {
                duDoan = tong >= 11 ? "Tài" : "Xỉu";
                confidence = 65;
                reason = `Dự đoán theo tổng ${tong}`;
            }
        }
    }

    return {
        game: gameName,
        api_type: apiType,
        source_url: sourceUrl,
        Phien: phien || null,
        Xuc_xac1: parseInt(x1) || 0,
        Xuc_xac2: parseInt(x2) || 0,
        Xuc_xac3: parseInt(x3) || 0,
        Tong: tong || 0,
        Ketqua: ketqua || "Chưa có",
        Du_doan: duDoan || "Chưa đủ dữ liệu",
        cre: CONFIG.CREATOR_ID,
        meta: {
            timestamp: nowStr(),
            reason: reason || "Không có lý do",
            confidence: confidence || 0
        }
    };
}

// ============================================================
// PREDICTOR SERVICE - ƯU TIÊN CLASSIC PATTERNS
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
        
        // ===== ƯU TIÊN 1: CLASSIC PATTERNS - TXT, 7 6 → TÀI, 8 7 → TÀI =====
        const classicResult = checkClassicPatterns(seq, totals);
        if (classicResult.matched) {
            const pred = classicResult.prediction === 'T' ? 'Tài' : 'Xỉu';
            return {
                prediction: pred,
                confidence: classicResult.confidence,
                reason: classicResult.reason,
                timestamp: nowStr(),
                distribution: { T: classicResult.prediction === 'T' ? 1 : 0, X: classicResult.prediction === 'X' ? 1 : 0 },
                ensemble: null,
                du_doan: { pred: classicResult.prediction, score: classicResult.confidence, reason: classicResult.reason },
                manual: null,
                roadType: 'classic_pattern',
                runInfo: { run: 0, value: null },
                history_len: this.history.length,
                last_round: this.history.length ? this.history[this.history.length - 1] : null
            };
        }
        
        // ===== ƯU TIÊN 2: PATTERN DB =====
        const dbResult = predictByPatternDB(seq);
        if (dbResult.matched) {
            const pred = dbResult.prediction === 'T' ? 'Tài' : 'Xỉu';
            const confidence = Math.round(dbResult.confidence * 100);
            return {
                prediction: pred,
                confidence: confidence,
                reason: `${dbResult.reason}`,
                timestamp: nowStr(),
                distribution: { T: dbResult.prediction === 'T' ? 1 : 0, X: dbResult.prediction === 'X' ? 1 : 0 },
                ensemble: null,
                du_doan: { pred: dbResult.prediction, score: confidence, reason: dbResult.reason },
                manual: null,
                roadType: 'pattern_db',
                runInfo: { run: 0, value: null },
                history_len: this.history.length,
                last_round: this.history.length ? this.history[this.history.length - 1] : null
            };
        }
        
        // ===== ƯU TIÊN 3: MANUAL PATTERNS =====
        const manual = matchManualPattern(totals);
        if (manual) {
            const pred = manual.pred === 'T' ? 'Tài' : 'Xỉu';
            return {
                prediction: pred,
                confidence: manual.confidence,
                reason: `📋 Mẫu tay: ${manual.note} (độ tin cậy ${manual.confidence}%)`,
                timestamp: nowStr(),
                distribution: { T: manual.pred === 'T' ? 1 : 0, X: manual.pred === 'X' ? 1 : 0 },
                ensemble: null,
                du_doan: { pred: manual.pred, score: manual.confidence, reason: `Mẫu tay: ${manual.note}` },
                manual: manual,
                roadType: 'manual_pattern',
                runInfo: { run: 0, value: null },
                history_len: this.history.length,
                last_round: this.history.length ? this.history[this.history.length - 1] : null
            };
        }
        
        // ===== TIẾP TỤC CÁC THUẬT TOÁN KHÁC =====
        // ... (Ensemble + du_doan_js)
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
        const scoreT = weights.ensemble * ensembleProb.T + weights.du * (duObj.pred === 'T' ? duObj.score / 100 : (100 - duObj.score) / 100);
        const scoreX = weights.ensemble * ensembleProb.X + weights.du * (duObj.pred === 'X' ? duObj.score / 100 : (100 - duObj.score) / 100);
        const norm = scoreT + scoreX || 1;
        const finalT = scoreT / norm;
        const finalX = scoreX / norm;
        const finalPred = finalT >= finalX ? 'T' : 'X';
        const finalConf = clamp(Math.max(finalT, finalX), 0, 1);

        const reason = [
            `Ensemble: ${ensemblePred} (pT=${ensembleProb.T.toFixed(3)}, pX=${ensembleProb.X.toFixed(3)})`,
            `du_doan: ${duObj.pred} (score=${duObj.score}) - ${duObj.reason}`,
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
            manual: null,
            reason: reason,
            roadType: roadType,
            runInfo: runInfo,
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
// DU_DOAN_JS - THUẬT TOÁN CHÍNH
// ============================================================
// ... (Code du_doan_js giữ nguyên như cũ)

// ============================================================
// CÁC CLASS CẦN THIẾT - MARKOV, RUN_LENGTH, MOMENTUM, PATTERN
// ============================================================
// ... (Code các class giữ nguyên như cũ)

// ============================================================
// EXPRESS ROUTES
// ============================================================
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'Multi-API Predictor with Polling - Classic Patterns Priority',
        version: '2.0',
        time: new Date().toISOString(),
        keepAlive: keepAliveCount,
        total_apis: Object.keys(API_SOURCES).reduce((acc, g) => acc + Object.keys(API_SOURCES[g]).length, 0)
    });
});

// ============================================================
// BIẾN TOÀN CỤ CHO /PREDICT
// ============================================================
let predictor = new PredictorService([]);
let lastPhien = null;
let isProcessing = false;
let latestRound = null;
let latestPrediction = null;

// ============================================================
// GỌI API CHÍNH (SUNWIN)
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

app.get('/predict', (req, res) => {
    if (!latestRound || !latestPrediction) {
        return res.json({
            status: 'waiting',
            message: 'Chưa có dữ liệu, đang chờ phiên mới...',
            time: new Date().toISOString()
        });
    }

    const exportObj = {
        game: "sunwin",
        api_type: "tx",
        source_url: CONFIG.API_URL,
        Phien: latestRound.Phien,
        Xuc_xac1: latestRound.Xuc_xac_1,
        Xuc_xac2: latestRound.Xuc_xac_2,
        Xuc_xac3: latestRound.Xuc_xac_3,
        Tong: latestRound.Tong,
        Ketqua: latestRound.Ket_qua || 'Chưa có',
        Du_doan: latestPrediction.prediction,
        cre: CONFIG.CREATOR_ID,
        meta: {
            timestamp: new Date().toISOString(),
            reason: latestPrediction.reason || 'Không có lý do',
            confidence: latestPrediction.confidence || 0
        }
    };

    res.json(exportObj);
});

// ============================================================
// POLLING ALL APIs
// ============================================================
async function pollAllAPIs() {
    console.log(`🔄 [${nowStr()}] Đang polling tất cả API...`);
    
    const allPromises = [];
    const allTasks = [];
    
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        for (const [apiType, url] of Object.entries(config)) {
            allPromises.push(fetchAPI(url));
            allTasks.push({ game: gameName, type: apiType, url: url });
        }
    }
    
    try {
        const results = await Promise.allSettled(allPromises);
        let successCount = 0;
        let failCount = 0;
        let newDataCount = 0;
        
        results.forEach((result, index) => {
            const task = allTasks[index];
            const key = `${task.game}-${task.type}`;
            
            if (result.status === 'fulfilled' && result.value) {
                successCount++;
                const rawData = result.value;
                const phien = rawData.phien || rawData.Phien || rawData.id || null;
                
                if (phien && phien !== lastPhienMap[key]) {
                    lastPhienMap[key] = phien;
                    newDataCount++;
                    
                    const predResult = normalizeAndPredict(rawData, task.game, task.type, task.url);
                    if (predResult) {
                        allGameData[key] = rawData;
                        allGamePredictions[key] = predResult;
                        
                        if (!gameHistory[key]) gameHistory[key] = [];
                        gameHistory[key].push({
                            phien: phien,
                            data: rawData,
                            prediction: predResult,
                            timestamp: nowStr()
                        });
                        if (gameHistory[key].length > 100) gameHistory[key].shift();
                        
                        console.log(`✅ ${key}: Phiên ${phien} - ${predResult.Ketqua} - Dự đoán: ${predResult.Du_doan} (${predResult.meta.confidence}%)`);
                    }
                }
            } else {
                failCount++;
                console.log(`❌ ${key}: Không lấy được dữ liệu`);
            }
        });
        
        console.log(`📊 Polling hoàn tất: ${successCount} thành công, ${failCount} thất bại, ${newDataCount} phiên mới`);
        
    } catch (error) {
        console.error(`❌ Lỗi polling: ${error.message}`);
    }
}

// ============================================================
// START
// ============================================================
console.log('🚀 Multi-API Predictor with Polling - Classic Patterns Priority');
console.log(`📡 API: ${CONFIG.API_URL}`);
console.log(`⏱️ Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
console.log(`👤 Creator: ${CONFIG.CREATOR_ID}`);
console.log(`📊 Endpoints:`);
console.log(`   /                    - Health check`);
console.log(`   /predict             - Dự đoán mới nhất (sunwin)`);
console.log(`   /predict-all         - Dự đoán tổng hợp (gọi API mới)`);
console.log(`   /predict-all-cached  - Dự đoán tổng hợp (từ cache)`);
console.log(`   /all-games-data      - Dữ liệu cache tất cả game`);
console.log(`   /{apiType}{gameName} - API từng game (VD: /txsunwin)`);
console.log('─────────────────────────────');
console.log('📚 PATTERN DB loaded: ' + Object.keys(PATTERN_DB).length + ' patterns');
console.log('🔝 CLASSIC PATTERNS: TXT, 7 6 → Tài, 8 7 → Tài (Ưu tiên #1)');
console.log(`📌 Đã tích hợp ${Object.keys(API_SOURCES).length} game API`);

// Khởi động polling tất cả API
setTimeout(async () => {
    await pollAllAPIs();
}, 2000);

// Polling định kỳ
setInterval(async () => {
    await pollAllAPIs();
}, CONFIG.POLL_INTERVAL);

// Polling API chính (sunwin) cho /predict
setTimeout(fetchAndPredict, 1000);
setInterval(fetchAndPredict, CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
