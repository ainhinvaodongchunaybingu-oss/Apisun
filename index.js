// ============================================================
// api_predict_render.js - Dự đoán Tài/Xỉu từ API
// Dùng cho Render.com - FULL 4 THUẬT TOÁN
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

// Import module dự đoán duy nhất
const { combinedPredict } = require('./module.js');

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
// CẤU HÌNH
// ============================================================
const CONFIG = {
    API_URL: 'https://trails-wish-motel-legacy.trycloudflare.com/api/tx',
    POLL_INTERVAL: 3000,
    HISTORY_KEY: "sun_predict_history_v1",
    PATTERN_MEM_KEY: "sun_predict_pattern_mem_v1",
    ERROR_MEM_KEY: "sun_predict_error_mem_v1",
    MAX_HISTORY_STORE: 2000,
    MARKOV_ORDER: 3,
    RUN_WINDOW_SHORT: 6,
    RUN_WINDOW_LONG: 20,
    BASE_CONFIDENCE: 0.5,
    
    CREATOR_ID: '@bucactaodi'
};

const API_SOURCES = {
    "sunwin": {
        "tx": "https://trails-wish-motel-legacy.trycloudflare.com/api/tx"
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
// BIẾN TOÀN CỤ CHO POLLING
// ============================================================
const gamePredictors = {};
const lastPhienMap = {};
const allGameData = {};
const allGamePredictions = {};
const gameHistory = {};

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
// PATTERN DB - DỮ LIỆU MẪU CẦU (THUẬT TOÁN 1)
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
    "TTTXTXT": { "prediction": "Xỉu", "confidence": 82 },
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
// MANUAL PATTERNS - MẪU TỔNG ĐIỂM (THUẬT TOÁN 2)
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
// HÀM PREDICT BY PATTERN DB (THUẬT TOÁN 1)
// ============================================================
function predictByPatternDB(seq) {
    if (!seq || seq.length < 2) return { matched: false };
    
    const pattern = seq.join('');
    const maxLen = Math.min(pattern.length, 10);
    
    for (let len = maxLen; len >= 2; len--) {
        const subPattern = pattern.slice(-len);
        if (PATTERN_DB[subPattern]) {
            const result = PATTERN_DB[subPattern];
            return {
                matched: true,
                prediction: result.prediction === 'Tài' ? 'T' : 'X',
                confidence: result.confidence,
                reason: `📊 ${result.prediction} (${result.confidence}%)`
            };
        }
    }
    return { matched: false, prediction: null, confidence: 0, reason: 'N/A' };
}

// ============================================================
// HÀM MATCH MANUAL PATTERN (THUẬT TOÁN 2)
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
        if (match) return { 
            pred: pat.pred, 
            confidence: 92,
            reason: `📏 ${pat.pred === 'T' ? 'Tài' : 'Xỉu'} (92%)`
        };
    }
    return null;
}

// ============================================================
// DU_DOAN_JS GỐC (THUẬT TOÁN 3) - FULL CODE
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
            return { 
                pred: dbResult.prediction, 
                score: dbResult.confidence, 
                reason: dbResult.reason
            };
        }

        // ===== KIỂM TRA MANUAL PATTERNS =====
        const totals = data_store ? (data_store.totals || []) : [];
        const manualResult = matchManualPattern(totals);
        if (manualResult) {
            return {
                pred: manualResult.pred,
                score: manualResult.confidence,
                reason: manualResult.reason
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
            return { pred: matched_pred === 'T' ? 'T' : 'X', score: Math.min(score, 99), reason: `🧠 ${matched_pred === 'T' ? 'Tài' : 'Xỉu'} (${Math.min(score, 99)}%)` };
        }

        // ===== KIỂM TRA LỖI =====
        const error_memory = ERROR_MEMORY || {};
        if (data_kq.length >= 3) {
            const last3 = data_kq.slice(-3).join(',');
            if (error_memory[last3] && error_memory[last3] >= 2) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 89, reason: `⚠️ ${du === 'T' ? 'Tài' : 'Xỉu'} (89%)` };
            }
        }

        // ===== KIỂM TRA SAI LIÊN TIẾP =====
        if (dem_sai >= 4) {
            const du = cuoi === 'T' ? 'X' : 'T';
            return { pred: du, score: 87, reason: `🔄 ${du === 'T' ? 'Tài' : 'Xỉu'} (87%)` };
        }

        // ===== KIỂM TRA CÂN BẰNG 5 PHIÊN =====
        if (data_kq.length >= 5) {
            const tail5 = data_kq.slice(-5);
            const countT = tail5.filter(x => 'T' === x).length;
            const countX = tail5.filter(x => 'X' === x).length;
            if (countT === countX && data_kq[data_kq.length - 1] !== data_kq[data_kq.length - 2]) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 88, reason: `⚖️ ${du === 'T' ? 'Tài' : 'Xỉu'} (88%)` };
            }
        }

        // ===== XỬ LÝ THEO SỐ LƯỢNG DỮ LIỆU =====
        if (data_kq.length < 1) {
            if (tong >= 16) return { pred: 'T', score: 98, reason: `🎯 Tài (98%)` };
            if (tong <= 6) return { pred: 'X', score: 98, reason: `🎯 Xỉu (98%)` };
            return { pred: tong >= 11 ? 'T' : 'X', score: 75, reason: `🎯 ${tong >= 11 ? 'Tài' : 'Xỉu'} (75%)` };
        }

        if (data_kq.length == 1) {
            if (tong >= 16) return { pred: 'T', score: 98, reason: `🎯 Tài (98%)` };
            if (tong <= 6) return { pred: 'X', score: 98, reason: `🎯 Xỉu (98%)` };
            const du = cuoi === 'T' ? 'X' : 'T';
            return { pred: du, score: 80, reason: `🎯 ${du === 'T' ? 'Tài' : 'Xỉu'} (80%)` };
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
                    if (sub1 === 'T'.repeat(i) && sub2 === 'X'.repeat(i)) return { pred: 'X', score: 90, reason: `📊 Xỉu (90%)` };
                    if (sub1 === 'X'.repeat(i) && sub2 === 'T'.repeat(i)) return { pred: 'T', score: 90, reason: `📊 Tài (90%)` };
                }
            }
        }

        // ===== KIỂM TRA ĐIỂM LẶP =====
        if (diem_lich_su.length >= 3 && (new Set(diem_lich_su.slice(-3))).size === 1) {
            return { pred: (tong % 2 === 1) ? 'T' : 'X', score: 96, reason: `🔄 ${(tong % 2 === 1) ? 'Tài' : 'Xỉu'} (96%)` };
        }

        if (diem_lich_su.length >= 2 && diem_lich_su[diem_lich_su.length - 1] === diem_lich_su[diem_lich_su.length - 2]) {
            return { pred: (tong % 2 === 0) ? 'T' : 'X', score: 94, reason: `🔄 ${(tong % 2 === 0) ? 'Tài' : 'Xỉu'} (94%)` };
        }

        // ===== KIỂM TRA 3 XÚC XẮC GIỐNG NHAU =====
        if (xx_list.length === 3 && xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
            const so = xx_list[0];
            if (['1', '2', '4'].includes(so)) return { pred: 'X', score: 97, reason: `🎲 Xỉu (97%)` };
            if (['3', '5'].includes(so)) return { pred: 'T', score: 97, reason: `🎲 Tài (97%)` };
            if (so === '6' && ben >= 3) return { pred: 'T', score: 97, reason: '🎲 Tài (97%)' };
        }

        // ===== XỬ LÝ BỆT =====
        if (ben >= 3) {
            if (cuoi === 'T') {
                if (ben >= 5 && !xx_list.includes('3')) {
                    if (!data_store.da_be_tai) { data_store.da_be_tai = true; return { pred: 'X', score: 80, reason: '⚠️ Xỉu (80%)' } }
                    else return { pred: 'T', score: 90, reason: '📈 Tài (90%)' };
                } else if (xx_list.includes('3')) {
                    data_store.da_be_tai = false;
                    return { pred: 'X', score: 95, reason: '🔀 Xỉu (95%)' };
                }
            } else {
                if (ben >= 5 && !xx_list.includes('5')) {
                    if (!data_store.da_be_xiu) { data_store.da_be_xiu = true; return { pred: 'T', score: 80, reason: '⚠️ Tài (80%)' } }
                    else return { pred: 'X', score: 90, reason: '📉 Xỉu (90%)' };
                } else if (xx_list.includes('5')) {
                    data_store.da_be_xiu = false;
                    return { pred: 'T', score: 95, reason: '🔀 Tài (95%)' };
                }
            }
            return { pred: cuoi, score: 93, reason: `📈 ${cuoi === 'T' ? 'Tài' : 'Xỉu'} (93%)` };
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
                return { pred: cuoi === 'T' ? 'X' : 'T', score: 90, reason: `📊 ${cuoi === 'T' ? 'Xỉu' : 'Tài'} (90%)` };
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
                        return { pred: (cuoi === 'X') ? 'T' : 'X', score: 90, reason: `📊 ${(cuoi === 'X') ? 'Tài' : 'Xỉu'} (90%)` };
                    }
                }
            }
        }

        // ===== KIỂM TRA SAI 3 LẦN =====
        if (dem_sai >= 3) return { pred: cuoi === 'T' ? 'X' : 'T', score: 88, reason: `🔄 ${cuoi === 'T' ? 'Xỉu' : 'Tài'} (88%)` };

        // ===== KIỂM TRA MẪU SAI CŨ =====
        if (data_kq.length >= 3 && pattern_sai.hasOwnProperty(data_kq.slice(-3).join(','))) {
            return { pred: cuoi === 'T' ? 'X' : 'T', score: 86, reason: `📊 ${cuoi === 'T' ? 'Xỉu' : 'Tài'} (86%)` };
        }

        // ===== KIỂM TRA LỆCH CẦU =====
        if (chenh >= 3) {
            const uu = countsObj.T > countsObj.X ? 'T' : 'X';
            return { pred: uu, score: 84, reason: `⚖️ ${uu === 'T' ? 'Tài' : 'Xỉu'} (84%)` };
        }

        // ============================================================
        // KHI KHÔNG CÓ MẪU - SỬ DỤNG THUẬT TOÁN DỰ PHÒNG
        // ============================================================
        
        // 1. Dựa trên tổng điểm
        if (tong >= 11 && tong <= 18) {
            const score = 60 + (tong - 10) * 3;
            return { pred: 'T', score: Math.min(score, 95), reason: `🎯 Tài (${Math.min(score, 95)}%)` };
        }
        if (tong >= 3 && tong <= 10) {
            const score = 60 + (11 - tong) * 3;
            return { pred: 'X', score: Math.min(score, 95), reason: `🎯 Xỉu (${Math.min(score, 95)}%)` };
        }

        // 2. Dựa trên xu hướng 3 phiên gần nhất
        if (data_kq.length >= 3) {
            const last3 = data_kq.slice(-3);
            const tCount = last3.filter(x => x === 'T').length;
            const xCount = last3.filter(x => x === 'X').length;
            if (tCount > xCount) {
                return { pred: 'T', score: 65, reason: `📈 Tài (65%)` };
            } else if (xCount > tCount) {
                return { pred: 'X', score: 65, reason: `📉 Xỉu (65%)` };
            }
        }

        // 3. Dựa trên trung bình điểm lịch sử
        if (diem_lich_su.length >= 3) {
            const avg = diem_lich_su.reduce((a, b) => a + b, 0) / diem_lich_su.length;
            if (avg >= 11) {
                return { pred: 'T', score: 68, reason: `📊 Tài (68%)` };
            } else {
                return { pred: 'X', score: 68, reason: `📊 Xỉu (68%)` };
            }
        }

        // 4. Dựa trên so sánh với phiên trước
        if (data_kq.length >= 2) {
            const prev = data_kq[data_kq.length - 2];
            if (prev !== cuoi && cuoi !== null) {
                return { pred: cuoi === 'T' ? 'X' : 'T', score: 70, reason: `🔄 ${cuoi === 'T' ? 'Xỉu' : 'Tài'} (70%)` };
            }
        }

        // 5. Mặc định: ưu tiên Tài nếu không có dữ liệu
        return { pred: 'T', score: 55, reason: '❓ Tài (55%)' };

    } catch (e) {
        return { pred: 'T', score: 50, reason: '❌ Tài (50%)' };
    }
}

// ============================================================
// FUNC PREDICT ALL 4 ALGORITHMS
// ============================================================
function predictAllAlgorithms(data_kq, totals, xx_str) {
    const results = {};
    const history = data_kq.map(kq => ({
        result: kq === 'T' ? 'Tài' : 'Xỉu',
        dice: [0, 0, 0],
        total: 0
    }));

    // THUẬT TOÁN 1: PATTERN DB
    const dbResult = predictByPatternDB(data_kq);
    results.pattern_db = {
        prediction: dbResult.prediction === 'T' ? 'Tài' : (dbResult.prediction === 'X' ? 'Xỉu' : null),
        confidence: dbResult.confidence || 0,
        reason: dbResult.reason || 'N/A'
    };

    // THUẬT TOÁN 2: MANUAL PATTERNS
    const manualResult = matchManualPattern(totals);
    if (manualResult) {
        results.manual = {
            prediction: manualResult.pred === 'T' ? 'Tài' : 'Xỉu',
            confidence: manualResult.confidence,
            reason: manualResult.reason
        };
    } else {
        results.manual = { 
            prediction: null, 
            confidence: 0, 
            reason: 'N/A' 
        };
    }

    // THUẬT TOÁN 3: DU_DOAN_JS GỐC
    try {
        const duResult = du_doan_js(data_kq, 0, {}, xx_str, [], { totals: totals, da_be_tai: false, da_be_xiu: false });
        results.du_doan_js = {
            prediction: duResult.pred === 'T' ? 'Tài' : 'Xỉu',
            confidence: duResult.score,
            reason: duResult.reason
        };
    } catch (e) {
        results.du_doan_js = { 
            prediction: null, 
            confidence: 0, 
            reason: 'Lỗi' 
        };
    }

    // THUẬT TOÁN 4: COMBINED PREDICT (MODULE.JS)
    try {
        const combinedResult = combinedPredict(history);
        results.combined = {
            prediction: combinedResult.prediction || null,
            confidence: combinedResult.confidence || 0,
            reason: combinedResult.details?.reason || 'N/A'
        };
        // Rút gọn reason cho combined
        if (results.combined.reason && results.combined.reason.length > 50) {
            results.combined.reason = `🧠 ${results.combined.prediction} (${results.combined.confidence}%)`;
        }
    } catch (e) {
        results.combined = { 
            prediction: null, 
            confidence: 0, 
            reason: 'Lỗi' 
        };
    }

    // TÍNH TRUNG BÌNH CONFIDENCE CỦA 4 THUẬT TOÁN
    const confidences = [];
    const predictions = [];
    
    for (const [name, algo] of Object.entries(results)) {
        if (algo.prediction) {
            predictions.push(algo.prediction);
            confidences.push(algo.confidence);
        }
    }

    // TÍNH TRUNG BÌNH CONFIDENCE
    let avgConfidence = 0;
    if (confidences.length > 0) {
        avgConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
    }

    // TỔNG HỢP KẾT QUẢ BẰNG VOTE
    const votes = { Tài: 0, Xỉu: 0 };
    const details = [];
    
    for (const [name, algo] of Object.entries(results)) {
        if (algo.prediction) {
            votes[algo.prediction] = (votes[algo.prediction] || 0) + 1;
            details.push(`${name}: ${algo.prediction} (${algo.confidence}%)`);
        }
    }

    let finalPred = null;
    let finalReason = '';

    if (votes.Tài > votes.Xỉu) {
        finalPred = 'Tài';
        finalReason = `✅ ${finalPred} (${avgConfidence}%) - ${confidences.length}/4 algorithms`;
    } else if (votes.Xỉu > votes.Tài) {
        finalPred = 'Xỉu';
        finalReason = `✅ ${finalPred} (${avgConfidence}%) - ${confidences.length}/4 algorithms`;
    } else {
        // Hòa, ưu tiên combined
        if (results.combined.prediction) {
            finalPred = results.combined.prediction;
            finalReason = `⚖️ ${finalPred} (${avgConfidence}%) - ưu tiên combined`;
        } else if (results.du_doan_js.prediction) {
            finalPred = results.du_doan_js.prediction;
            finalReason = `⚖️ ${finalPred} (${avgConfidence}%) - ưu tiên du_doan_js`;
        } else {
            finalPred = 'Tài';
            finalReason = `❓ ${finalPred} (50%) - mặc định`;
        }
    }

    return {
        final: {
            prediction: finalPred,
            confidence: avgConfidence,
            reason: finalReason
        },
        algorithms: results,
        votes: votes,
        details: details,
        avg_confidence: avgConfidence
    };
}

// ============================================================
// CÁC HÀM HỖ TRỢ CHO PREDICTOR SERVICE
// ============================================================
function nowStr() {
    return new Date().toISOString();
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function seqFromHistory(history) {
    return history.map(h => {
        if (h.Ket_qua) return h.Ket_qua === 'Tài' ? 'T' : 'X';
        if (h.ket_qua) return h.ket_qua === 'Tài' ? 'T' : 'X';
        if (h.result) return h.result === 'Tài' || h.result === 'T' ? 'T' : 'X';
        return null;
    }).filter(x => x);
}

function classifyRoad(seq) {
    if (seq.length < 6) return 'short';
    const last6 = seq.slice(-6);
    const uniq = new Set(last6);
    if (uniq.size === 1) return 'run';
    if (uniq.size === 2 && last6.filter(x => x === 'T').length === 3) return 'balanced';
    const last3 = seq.slice(-3);
    if (new Set(last3).size === 1) return 'trend';
    return 'mixed';
}

function computeRunLength(seq) {
    if (!seq.length) return { run: 0, value: null };
    const last = seq[seq.length - 1];
    let run = 1;
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) run++;
        else break;
    }
    return { run, value: last };
}

// ============================================================
// ENSEMBLE - GIỮ LẠI CHO TƯƠNG THÍCH
// ============================================================
const CONFIG_MODELS = ['markov', 'frequency', 'pattern', 'trend', 'rsi'];

class Ensemble {
    constructor() {
        this.weights = {};
        CONFIG_MODELS.forEach(m => this.weights[m] = 1 / CONFIG_MODELS.length);
        this.models = {
            markov: { detect: (seq) => { return { type: 'markov' } } },
            frequency: { detect: (seq) => { return { type: 'frequency' } } },
            pattern: { detect: (seq) => { return { type: 'pattern' } } },
            trend: { detect: (seq) => { return { type: 'trend' } } },
            rsi: { detect: (seq) => { return { type: 'rsi' } } }
        };
        this.modelResults = {};
    }

    trainAll(seq) {
        this.seq = seq;
    }

    predictProba(seq) {
        const history = seq.map(s => ({
            result: s === 'T' ? 'Tài' : 'Xỉu',
            dice: [0, 0, 0],
            total: 0
        }));
        
        try {
            const result = combinedPredict(history);
            const dist = {
                T: result.prediction === 'Tài' ? 0.7 : 0.3,
                X: result.prediction === 'Xỉu' ? 0.7 : 0.3
            };
            const conf = (result.confidence || 50) / 100;
            if (result.prediction === 'Tài') {
                dist.T = 0.5 + conf * 0.4;
                dist.X = 1 - dist.T;
            } else {
                dist.X = 0.5 + conf * 0.4;
                dist.T = 1 - dist.X;
            }
            return {
                distribution: dist,
                modelProbas: {
                    markov: dist,
                    frequency: dist,
                    pattern: dist,
                    trend: dist,
                    rsi: dist
                },
                models: CONFIG_MODELS
            };
        } catch (e) {
            return {
                distribution: { T: 0.5, X: 0.5 },
                modelProbas: {},
                models: []
            };
        }
    }

    updateWeights(seq, actual) {
        // Simplified
    }
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
        this.data_store = { totals: [], da_be_tai: false, da_be_xiu: false };
        this.dem_sai = 0;
        this.pattern_sai = {};
        this.diem_lich_su = [];
        this.lastPhienNumber = 0;
    }

    // Hàm tăng phiên +1 đúng định dạng
    incrementPhien(phien) {
        if (!phien) return '001';
        // Tách số từ chuỗi phiên
        const match = phien.match(/(\d+)$/);
        if (match) {
            const num = parseInt(match[1]) + 1;
            return phien.replace(/\d+$/, String(num).padStart(match[1].length, '0'));
        }
        return phien + '-001';
    }

    predict() {
        const seq = seqFromHistory(this.history);
        const totals = this.history.map(h => {
            if (h.Tong !== undefined) return h.Tong;
            if (h.tong !== undefined) return h.tong;
            if (h.total !== undefined) return h.total;
            return null;
        }).filter(x => x !== null);

        this.data_store.totals = totals;

        const roadType = classifyRoad(seq);
        const modelOut = this.ensemble.predictProba(seq);
        const top = Math.max(modelOut.distribution.T, modelOut.distribution.X);
        const entropy = -(modelOut.distribution.T * Math.log2(modelOut.distribution.T + 1e-9) + modelOut.distribution.X * Math.log2(modelOut.distribution.X + 1e-9));
        const conf = clamp(0.5 * 0.3 + top * 0.6 + 0.1 - (entropy * 0.05), 0, 1);
        const predicted = modelOut.distribution.T >= modelOut.distribution.X ? 'T' : 'X';

        const last = this.history.length ? this.history[this.history.length - 1] : null;
        const xx_str = last && last.Xuc_xac_1 ? `${last.Xuc_xac_1}-${last.Xuc_xac_2}-${last.Xuc_xac_3}` : (last && last.xi ? last.xi : (last && last.xuc_xac_1 ? `${last.xuc_xac_1}-${last.xuc_xac_2}-${last.xuc_xac_3}` : ''));
        const human_seq_labels = this.history.map(h => {
            if (h.Ket_qua) return h.Ket_qua === 'Tài' ? 'T' : 'X';
            if (h.ket_qua) return h.ket_qua === 'Tài' ? 'T' : 'X';
            if (h.result) return h.result === 'T' ? 'T' : 'X';
            return null;
        }).filter(x => x);

        // GỌI HÀM DỰ ĐOÁN FULL 4 THUẬT TOÁN
        const allAlgorithms = predictAllAlgorithms(human_seq_labels, totals, xx_str);

        // Lấy kết quả từ du_doan_js để kết hợp với ensemble
        const duObj = allAlgorithms.algorithms.du_doan_js;

        const ensembleProb = modelOut.distribution;
        const ensemblePred = ensembleProb.T >= ensembleProb.X ? 'T' : 'X';

        let weights = { ensemble: 0.30, du: 0.30, pattern: 0.20, manual: 0.20 };
        
        // Tính điểm từ từng thuật toán
        const getScore = (pred, conf) => {
            if (!pred) return 0.5;
            return pred === 'T' ? conf / 100 : (100 - conf) / 100;
        };

        const scoreT = 
            weights.ensemble * ensembleProb.T +
            weights.du * getScore(duObj.pred === 'T' ? 'T' : 'X', duObj.score) +
            weights.pattern * getScore(
                allAlgorithms.algorithms.pattern_db.prediction === 'Tài' ? 'T' : 'X',
                allAlgorithms.algorithms.pattern_db.confidence
            ) +
            weights.manual * getScore(
                allAlgorithms.algorithms.manual.prediction === 'Tài' ? 'T' : 'X',
                allAlgorithms.algorithms.manual.confidence
            );

        const scoreX = 
            weights.ensemble * ensembleProb.X +
            weights.du * getScore(duObj.pred === 'X' ? 'X' : 'T', duObj.score) +
            weights.pattern * getScore(
                allAlgorithms.algorithms.pattern_db.prediction === 'Xỉu' ? 'X' : 'T',
                allAlgorithms.algorithms.pattern_db.confidence
            ) +
            weights.manual * getScore(
                allAlgorithms.algorithms.manual.prediction === 'Xỉu' ? 'X' : 'T',
                allAlgorithms.algorithms.manual.confidence
            );

        const norm = scoreT + scoreX || 1;
        const finalT = scoreT / norm;
        const finalX = scoreX / norm;
        const finalPred = finalT >= finalX ? 'T' : 'X';
        const finalConf = clamp(Math.max(finalT, finalX), 0, 1);

        // CHỈ LẤY 1 CONFIDENCE DUY NHẤT từ allAlgorithms
        const finalConfidence = allAlgorithms.avg_confidence || Math.round(finalConf * 100);

        // REASON NGẮN GỌN - CHỈ 1 DÒNG DUY NHẤT
        const reason = `🎯 ${finalPred === 'T' ? 'Tài' : 'Xỉu'} (${finalConfidence}%) | 📊${allAlgorithms.algorithms.pattern_db.confidence}% 📏${allAlgorithms.algorithms.manual.confidence}% 🧠${duObj.score}% ⚡${allAlgorithms.algorithms.combined.confidence}%`;

        // Tăng phiên +1 đúng định dạng
        let nextPhien = null;
        if (last && last.Phien) {
            nextPhien = this.incrementPhien(last.Phien);
        } else {
            nextPhien = '20240101-001';
        }

        return {
            timestamp: nowStr(),
            phien_du_doan: nextPhien,
            prediction: finalPred === 'T' ? 'Tài' : 'Xỉu',
            confidence: finalConfidence,
            distribution: { T: finalT, X: finalX },
            all_algorithms: allAlgorithms,
            ensemble: modelOut,
            du_doan: duObj,
            reason: reason,
            roadType,
            runInfo: computeRunLength(seq),
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
        
        if (actualRound.Tong !== undefined) {
            if (!this.data_store.totals) this.data_store.totals = [];
            this.data_store.totals.push(actualRound.Tong);
            if (this.data_store.totals.length > 100) this.data_store.totals.shift();
        }

        try {
            const pred = this.predict();
            this.predHistory.push({
                phien: pred.phien_du_doan,
                prediction: pred.prediction,
                confidence: pred.confidence,
                timestamp: nowStr()
            });
            if (this.predHistory.length > 100) this.predHistory.shift();
        } catch(e) { /* ignore */ }
    }
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
// HÀM CHUẨN HÓA DỮ LIỆU VÀ DỰ ĐOÁN
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
    let reason = "Chưa có dữ liệu";
    let allAlgorithms = null;
    let phienDuDoan = null;

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
            allAlgorithms = predResult.all_algorithms;
            phienDuDoan = predResult.phien_du_doan;
        } catch (e) {
            if (tong !== null) {
                duDoan = tong >= 11 ? "Tài" : "Xỉu";
                confidence = 65;
                reason = `🎯 ${duDoan} (65%)`;
            }
        }
    }

    return {
        game: gameName,
        api_type: apiType,
        source_url: sourceUrl,
        Phien: phien || null,
        Phien_du_doan: phienDuDoan || null,
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
        },
        algorithms: allAlgorithms
    };
}

// ============================================================
// POLLING ALL APIS
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
                        
                        console.log(`✅ ${key}: Phiên ${phien} -> Dự đoán ${predResult.Phien_du_doan}: ${predResult.Du_doan} (${predResult.meta.confidence}%)`);
                    }
                }
            } else {
                failCount++;
            }
        });
        
        console.log(`📊 Polling: ${successCount} OK, ${failCount} fail, ${newDataCount} new`);
        
    } catch (error) {
        console.error(`❌ Lỗi polling: ${error.message}`);
    }
}

function getLatestFromCache(gameName, apiType) {
    const key = `${gameName}-${apiType}`;
    return {
        data: allGameData[key] || null,
        prediction: allGamePredictions[key] || null,
        history: gameHistory[key] || []
    };
}

// ============================================================
// EXPRESS ROUTES
// ============================================================

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        timestamp: nowStr(),
        creator: CONFIG.CREATOR_ID,
        algorithms: ['PATTERN_DB', 'MANUAL_PATTERNS', 'du_doan_js', 'combinedPredict'],
        games: Object.keys(API_SOURCES)
    });
});

let predictor = new PredictorService([]);
let lastPhien = null;
let isProcessing = false;
let latestRound = null;
let latestPrediction = null;

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
        Phien_du_doan: latestPrediction.phien_du_doan || null,
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
        },
        algorithms: latestPrediction.all_algorithms || null
    };

    res.json(exportObj);
});

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

app.get('/all-predictions', (req, res) => {
    const predictions = predictor.predHistory || [];
    res.json({
        total: predictions.length,
        predictions: predictions.slice(-50)
    });
});

app.get('/all-games-data', (req, res) => {
    const result = {};
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        result[gameName] = {};
        for (const [apiType, url] of Object.entries(config)) {
            const cache = getLatestFromCache(gameName, apiType);
            result[gameName][apiType] = {
                url: url,
                data: cache.data,
                prediction: cache.prediction,
                history: cache.history.slice(-20)
            };
        }
    }
    res.json({
        timestamp: nowStr(),
        games: result
    });
});

app.get('/predict-all-cached', (req, res) => {
    const predictions = [];
    const details = [];
    
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        for (const [apiType, url] of Object.entries(config)) {
            const cache = getLatestFromCache(gameName, apiType);
            if (cache.prediction) {
                predictions.push(cache.prediction);
                details.push(`${gameName}-${apiType}: ${cache.prediction.Du_doan} (${cache.prediction.meta.confidence}%) -> ${cache.prediction.Phien_du_doan}`);
            }
        }
    }
    
    if (predictions.length === 0) {
        return res.json({
            status: 'waiting',
            message: 'Chưa có dữ liệu dự đoán',
            timestamp: nowStr()
        });
    }
    
    let taiCount = 0, xiuCount = 0;
    predictions.forEach(p => {
        if (p.Du_doan === "Tài") taiCount++;
        else if (p.Du_doan === "Xỉu") xiuCount++;
    });
    
    const total = predictions.length;
    const taiRatio = taiCount / total;
    const xiuRatio = xiuCount / total;
    const confidence = Math.round(Math.max(taiRatio, xiuRatio) * 100);
    const finalPred = taiRatio >= xiuRatio ? "Tài" : "Xỉu";
    
    res.json({
        status: 'success',
        timestamp: nowStr(),
        summary: {
            total_sources: total,
            tai_count: taiCount,
            xiu_count: xiuCount,
            prediction: finalPred,
            confidence: confidence,
            details: details
        },
        predictions: predictions
    });
});

app.get('/predict-all', async (req, res) => {
    const gameFilter = req.query.games ? req.query.games.split(',') : Object.keys(API_SOURCES);
    const typeFilter = req.query.types ? req.query.types.split(',') : ['tx', 'txmd5'];

    const fetchPromises = [];
    const fetchTasks = [];

    for (const gameName of gameFilter) {
        const config = API_SOURCES[gameName];
        if (!config) continue;
        for (const apiType of typeFilter) {
            const url = config[apiType];
            if (url) {
                fetchPromises.push(fetchAPI(url));
                fetchTasks.push({ game: gameName, type: apiType, url: url });
            }
        }
    }

    if (fetchPromises.length === 0) {
        return res.json({
            status: 'error',
            message: 'Không có API nào được chọn',
            available_games: Object.keys(API_SOURCES)
        });
    }

    try {
        const results = await Promise.allSettled(fetchPromises);
        const predictions = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const task = fetchTasks[index];
                const pred = normalizeAndPredict(result.value, task.game, task.type, task.url);
                if (pred) {
                    predictions.push(pred);
                }
            }
        });

        let taiCount = 0, xiuCount = 0;
        const details = [];
        predictions.forEach(p => {
            if (p.Du_doan === "Tài") taiCount++;
            else if (p.Du_doan === "Xỉu") xiuCount++;
            details.push(`${p.game}-${p.api_type}: ${p.Du_doan} (${p.meta.confidence}%) -> ${p.Phien_du_doan}`);
        });

        const total = predictions.length;
        const taiRatio = taiCount / total;
        const xiuRatio = xiuCount / total;
        const confidence = Math.round(Math.max(taiRatio, xiuRatio) * 100);
        const finalPred = taiRatio >= xiuRatio ? "Tài" : "Xỉu";

        res.json({
            status: 'success',
            timestamp: nowStr(),
            summary: {
                total_sources: total,
                tai_count: taiCount,
                xiu_count: xiuCount,
                prediction: finalPred,
                confidence: confidence,
                details: details
            },
            predictions: predictions
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi xử lý dự đoán',
            detail: error.message
        });
    }
});

// ============================================================
// TẠO ENDPOINT ĐỘNG CHO TỪNG GAME
// ============================================================
for (const [gameName, config] of Object.entries(API_SOURCES)) {
    for (const [apiType, url] of Object.entries(config)) {
        const routePath = `/${apiType}${gameName}`;
        app.get(routePath, async (req, res) => {
            const cache = getLatestFromCache(gameName, apiType);
            
            if (cache.prediction) {
                const pred = cache.prediction;
                const exportObj = {
                    game: pred.game,
                    api_type: pred.api_type,
                    source_url: pred.source_url,
                    Phien: pred.Phien,
                    Phien_du_doan: pred.Phien_du_doan || null,
                    Xuc_xac1: pred.Xuc_xac1,
                    Xuc_xac2: pred.Xuc_xac2,
                    Xuc_xac3: pred.Xuc_xac3,
                    Tong: pred.Tong,
                    Ketqua: pred.Ketqua,
                    Du_doan: pred.Du_doan,
                    cre: pred.cre,
                    meta: pred.meta,
                    algorithms: pred.algorithms
                };
                return res.json(exportObj);
            }
            
            try {
                const rawData = await fetchAPI(url);
                if (!rawData) {
                    return res.status(503).json({
                        error: `Không thể lấy dữ liệu từ game "${gameName}" (${apiType})`,
                        api_url: url
                    });
                }
                
                const result = normalizeAndPredict(rawData, gameName, apiType, url);
                if (!result) {
                    return res.status(500).json({
                        error: `Không thể xử lý dữ liệu từ game "${gameName}"`,
                        api_url: url
                    });
                }
                
                const exportObj = {
                    game: result.game,
                    api_type: result.api_type,
                    source_url: result.source_url,
                    Phien: result.Phien,
                    Phien_du_doan: result.Phien_du_doan || null,
                    Xuc_xac1: result.Xuc_xac1,
                    Xuc_xac2: result.Xuc_xac2,
                    Xuc_xac3: result.Xuc_xac3,
                    Tong: result.Tong,
                    Ketqua: result.Ketqua,
                    Du_doan: result.Du_doan,
                    cre: result.cre,
                    meta: result.meta,
                    algorithms: result.algorithms
                };
                
                res.json(exportObj);
            } catch (error) {
                res.status(500).json({
                    error: `Lỗi khi xử lý dữ liệu từ game "${gameName}"`,
                    detail: error.message
                });
            }
        });
        console.log(`✅ Route: ${routePath}`);
    }
}

// ============================================================
// FETCH AND PREDICT CHO SUNWIN
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

            try { predictor.learn(round); } catch (e) {}

            try { latestPrediction = predictor.predict(); } catch (e) {}
        }
    } catch (error) {}

    isProcessing = false;
}

// ============================================================
// START
// ============================================================
console.log('🚀 FULL 4 ALGORITHMS - Predictor started');
console.log(`📡 API: ${CONFIG.API_URL}`);
console.log(`⏱️ Poll: ${CONFIG.POLL_INTERVAL}ms`);
console.log(`👤 Creator: ${CONFIG.CREATOR_ID}`);
console.log(`📊 4 ALGORITHMS: PATTERN_DB | MANUAL_PATTERNS | du_doan_js | combinedPredict`);
console.log(`📌 ${Object.keys(API_SOURCES).length} games`);

setTimeout(async () => {
    await pollAllAPIs();
}, 2000);

setInterval(async () => {
    await pollAllAPIs();
}, CONFIG.POLL_INTERVAL);

setTimeout(fetchAndPredict, 1000);
setInterval(fetchAndPredict, CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

process.stdin.resume();
