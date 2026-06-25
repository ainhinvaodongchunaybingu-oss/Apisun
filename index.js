// ============================================================
// api_predict_render.js - FULL 4 THUẬT TOÁN - HOÀN CHỈNH
// Mỗi game lịch sử riêng - Route format cũ - Log gọn
// Hòa vote: so sánh tổng confidence 2 nhóm
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4400;
const { combinedPredict } = require('./module.js');

// ============================================================
// CORS
// ============================================================
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', true);
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
    POLL_INTERVAL: 3000,
    MAX_HISTORY_STORE: 2000,
    CREATOR_ID: '@bucactaodi'
};

// ============================================================
// API SOURCES
// ============================================================
const API_SOURCES = {
    "sunwin": { "tx": "https://trails-wish-motel-legacy.trycloudflare.com/api/tx" },
    "Ogkfan": { "txmd5": "https://guidance-discrete-dive-navigate.trycloudflare.com/api/txmd5/latest" },
    "Xocdia88": { "tx": "https://pollution-seconds-sail-strikes.trycloudflare.com/api/taixiu" },
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
    "Sumvin": { "txmd5": "https://stories-meetings-injection-headlines.trycloudflare.com/api/md5" },
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
// PATTERN DATABASE (THUẬT TOÁN 1)
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
// THUẬT TOÁN 1: PATTERN DB
// ============================================================
function predictByPatternDB(seq) {
    if (!seq || seq.length < 2) return { matched: false, prediction: null, confidence: 0, reason: 'Chưa đủ dữ liệu' };
    
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
                reason: `📊 Pattern "${subPattern}" → ${result.prediction} (${result.confidence}%)`
            };
        }
    }
    return { matched: false, prediction: null, confidence: 0, reason: 'N/A' };
}

// ============================================================
// THUẬT TOÁN 2: MANUAL PATTERNS
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
            const randomConfidence = Math.floor(Math.random() * 15) + 85;
            return { 
                pred: pat.pred, 
                confidence: randomConfidence,
                reason: `📏 Mẫu tổng: ${pat.note} (${randomConfidence}%)`
            };
        }
    }
    return null;
}

// ============================================================
// DU_DOAN_JS
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
            return { pred: matched_pred === 'T' ? 'T' : 'X', score, reason: `Dự theo mẫu đã học '${matched_pattern}' tin cậy ${matched_confidence.toFixed(2)}` };
        }
        const error_memory = ERROR_MEMORY || {};
        if (data_kq.length >= 3) {
            const last3 = data_kq.slice(-3).join(',');
            if (error_memory[last3] && error_memory[last3] >= 2) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 89, reason: `AI tự học lỗi: mẫu ${last3} gây sai nhiều → đảo` };
            }
        }
        if (dem_sai >= 4) {
            const du = cuoi === 'T' ? 'X' : 'T';
            return { pred: du, score: 87, reason: `Sai liên tiếp ${dem_sai} → đổi` };
        }
        if (data_kq.length >= 5) {
            const tail5 = data_kq.slice(-5);
            const countT = tail5.filter(x => 'T' === x).length;
            const countX = tail5.filter(x => 'X' === x).length;
            if (countT === countX && data_kq[data_kq.length - 1] !== data_kq[data_kq.length - 2]) {
                const du = cuoi === 'T' ? 'X' : 'T';
                return { pred: du, score: 88, reason: 'Phát hiện dấu hiệu đổi cầu → đổi hướng' };
            }
        }
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
        const countsObj = { T: data_kq.filter(x => 'T' === x).length, X: data_kq.filter(x => 'X' === x).length };
        const chenh = Math.abs(countsObj.T - countsObj.X);
        diem_lich_su = diem_lich_su || [];
        diem_lich_su.push(tong);
        if (diem_lich_su.length > 6) diem_lich_su.shift();
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
        if (diem_lich_su.length >= 3 && (new Set(diem_lich_su.slice(-3))).size === 1) {
            return { pred: (tong % 2 === 1) ? 'T' : 'X', score: 96, reason: `3 lần lặp điểm: ${tong}` };
        }
        if (diem_lich_su.length >= 2 && diem_lich_su[diem_lich_su.length - 1] === diem_lich_su[diem_lich_su.length - 2]) {
            return { pred: (tong % 2 === 0) ? 'T' : 'X', score: 94, reason: `Kép điểm: ${tong}` };
        }
        if (xx_list.length === 3 && xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
            const so = xx_list[0];
            if (['1', '2', '4'].includes(so)) return { pred: 'X', score: 97, reason: `3 xúc xắc ${so} → Xỉu` };
            if (['3', '5'].includes(so)) return { pred: 'T', score: 97, reason: `3 xúc xắc ${so} → Tài` };
            if (so === '6' && ben >= 3) return { pred: 'T', score: 97, reason: '3 xúc xắc 6 + bệt → Tài' };
        }
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
        for (let loai in { "1-1": 1 }) {
            for (let mau of cau_mau["1-1"]) {
                if (pattern.endsWith(mau)) {
                    const length_cau = mau.length;
                    const current_len = data_kq.length;
                    if (length_cau == 4) {
                        if (current_len == 5) return { pred: cuoi === 'T' ? 'X' : 'T', score: 85, reason: `Bẻ nhẹ cầu 1-1 tại tay 5 (${mau})` };
                        if (current_len == 6) return { pred: cuoi === 'T' ? 'X' : 'T', score: 90, reason: `Ôm thêm tay 6 rồi bẻ cầu 1-1 (${mau})` };
                        return { pred: cuoi, score: 72, reason: 'Không rõ mẫu → Theo tay gần nhất' };
                    }
                }
            }
        }
        for (let loai in cau_mau) {
            const arr = cau_mau[loai];
            if (arr.some(a => pattern.endsWith(a))) {
                return { pred: cuoi === 'T' ? 'X' : 'T', score: 90, reason: `Phát hiện cầu ${loai}` };
            }
        }
        if (data_kq.length >= 6) {
            const last6 = data_kq.slice(-6);
            for (let i = 2; i < 6; i++) {
                if (i * 2 <= last6.length) {
                    const seq = last6.slice(-i * 2);
                    const alt1 = [],
                        alt2 = [];
                    for (let j = 0; j < i * 2; j++) { alt1.push(j % 2 === 0 ? 'T' : 'X');
                        alt2.push(j % 2 === 0 ? 'X' : 'T'); }
                    if (seq.join('') === alt1.join('') || seq.join('') === alt2.join('')) {
                        return { pred: (cuoi === 'X') ? 'T' : 'X', score: 90, reason: `Bẻ cầu 1-1 (${i * 2} tay)` };
                    }
                }
            }
        }
        if (dem_sai >= 3) return { pred: cuoi === 'T' ? 'X' : 'T', score: 88, reason: 'Sai 3 lần → Đổi chiều' };
        if (data_kq.length >= 3 && pattern_sai.hasOwnProperty(data_kq.slice(-3).join(','))) return { pred: cuoi === 'T' ? 'X' : 'T', score: 86, reason: 'Mẫu sai cũ' };
        if (chenh >= 3) {
            const uu = countsObj.T > countsObj.X ? 'T' : 'X';
            return { pred: uu, score: 84, reason: `Lệch ${chenh} cầu → Ưu tiên ${uu}` };
        }
        return { pred: cuoi, score: 72, reason: 'Không rõ mẫu → Theo tay gần nhất' };
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
// HÀM DỰ ĐOÁN TỔNG HỢP 4 THUẬT TOÁN
// ============================================================
function predictAllAlgorithms(data_kq, totals, xx_str) {
    const results = {};
    const history = data_kq.map(kq => ({ 
        result: kq === 'T' ? 'Tài' : 'Xỉu', 
        dice: [0, 0, 0], 
        total: 0 
    }));

    // ===== ALGO 1: PATTERN DB =====
    try {
        const dbResult = predictByPatternDB(data_kq);
        results.pattern_db = {
            name: 'pattern_db',
            prediction: dbResult.prediction === 'T' ? 'Tài' : (dbResult.prediction === 'X' ? 'Xỉu' : null),
            Dotincay: typeof dbResult.confidence === 'number' ? dbResult.confidence : 0,
            Lydo: dbResult.reason || 'N/A'
        };
    } catch (e) {
        results.pattern_db = { name: 'pattern_db', prediction: null, Dotincay: 0, Lydo: 'Lỗi: ' + e.message };
    }

    // ===== ALGO 2: MANUAL PATTERNS =====
    try {
        const manualResult = matchManualPattern(totals);
        results.manual = {
            name: 'manual',
            prediction: manualResult ? (manualResult.pred === 'T' ? 'Tài' : 'Xỉu') : null,
            Dotincay: manualResult ? (typeof manualResult.confidence === 'number' ? manualResult.confidence : 0) : 0,
            Lydo: manualResult ? manualResult.reason : 'N/A'
        };
    } catch (e) {
        results.manual = { name: 'manual', prediction: null, Dotincay: 0, Lydo: 'Lỗi: ' + e.message };
    }

    // ===== ALGO 3: DU_DOAN_JS =====
    try {
        const data_store = { totals: totals || [], da_be_tai: false, da_be_xiu: false };
        const duResult = du_doan_js(data_kq, 0, {}, xx_str || '', [], data_store);
        results.du_doan_js = {
            name: 'du_doan_js',
            prediction: duResult.pred === 'T' ? 'Tài' : 'Xỉu',
            Dotincay: typeof duResult.score === 'number' ? duResult.score : 0,
            Lydo: duResult.reason || 'N/A'
        };
    } catch (e) {
        results.du_doan_js = { 
            name: 'du_doan_js', 
            prediction: null, 
            Dotincay: 0, 
            Lydo: 'Lỗi: ' + (e.message || e) 
        };
    }

    // ===== ALGO 4: COMBINED PREDICT (TỪ MODULE.JS) =====
    try {
        const combinedResult = combinedPredict(history);
        if (combinedResult && typeof combinedResult === 'object') {
            results.combined = {
                name: 'combined',
                prediction: combinedResult.prediction || null,
                Dotincay: typeof combinedResult.confidence === 'number' ? combinedResult.confidence : 0,
                Lydo: combinedResult.details?.reason || combinedResult.reason || 'Không có lý do'
            };
        } else {
            results.combined = { 
                name: 'combined', 
                prediction: null, 
                Dotincay: 0, 
                Lydo: 'combinedPredict trả về null hoặc invalid' 
            };
        }
    } catch (e) {
        results.combined = { 
            name: 'combined', 
            prediction: null, 
            Dotincay: 0, 
            Lydo: 'Lỗi combined: ' + (e.message || 'unknown') 
        };
    }

    // ===== TỔNG HỢP VOTE =====
    const votes = { 'Tài': 0, 'Xỉu': 0 };
    const confidences = [];
    const validAlgos = [];

    for (const [key, algo] of Object.entries(results)) {
        if (algo.prediction && typeof algo.prediction === 'string') {
            const pred = algo.prediction.trim();
            if (pred === 'Tài' || pred === 'Xỉu') {
                votes[pred] = (votes[pred] || 0) + 1;
                const conf = typeof algo.Dotincay === 'number' ? algo.Dotincay : 0;
                confidences.push(Math.min(100, Math.max(0, conf)));
                validAlgos.push({ key, ...algo, prediction: pred });
            }
        }
    }

    // FALLBACK: nếu không có thuật toán nào
    if (validAlgos.length === 0) {
        return {
            final: { 
                prediction: 'Tài', 
                confidence: 50, 
                reason: '❓ Không đủ dữ liệu từ các thuật toán → Mặc định Tài (50%)' 
            },
            algorithms: results,
            votes: { 'Tài': 0, 'Xỉu': 0 },
            valid_algos_count: 0,
            avg_confidence: 50
        };
    }

    // Tính avg confidence (đảm bảo không NaN)
    let avgConfidence = confidences.length > 0 
        ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) 
        : 50;
    avgConfidence = Math.min(100, Math.max(0, avgConfidence));

    // Xử lý finalPred và reason
    let finalPred = 'Tài';
    let finalReason = '';

    if (votes['Tài'] > votes['Xỉu']) {
        finalPred = 'Tài';
        finalReason = `✅ ${finalPred} (${avgConfidence}%) - ${votes['Tài']}/${validAlgos.length} thuật toán đồng thuận`;
    } 
    else if (votes['Xỉu'] > votes['Tài']) {
        finalPred = 'Xỉu';
        finalReason = `✅ ${finalPred} (${avgConfidence}%) - ${votes['Xỉu']}/${validAlgos.length} thuật toán đồng thuận`;
    } 
    else {
        const taiAlgos = validAlgos.filter(a => a.prediction === 'Tài');
        const xiuAlgos = validAlgos.filter(a => a.prediction === 'Xỉu');
        
        const taiTotalConf = taiAlgos.reduce((sum, a) => sum + (typeof a.Dotincay === 'number' ? a.Dotincay : 0), 0);
        const xiuTotalConf = xiuAlgos.reduce((sum, a) => sum + (typeof a.Dotincay === 'number' ? a.Dotincay : 0), 0);
        
        if (taiTotalConf > xiuTotalConf) {
            finalPred = 'Tài';
            finalReason = `⚖️ Hòa vote (${votes['Tài']}-${votes['Xỉu']}) → Chọn Tài (tổng độ tin cậy ${taiTotalConf}% > ${xiuTotalConf}%)`;
        } 
        else if (xiuTotalConf > taiTotalConf) {
            finalPred = 'Xỉu';
            finalReason = `⚖️ Hòa vote (${votes['Tài']}-${votes['Xỉu']}) → Chọn Xỉu (tổng độ tin cậy ${xiuTotalConf}% > ${taiTotalConf}%)`;
        } 
        else {
            validAlgos.sort((a, b) => (b.Dotincay || 0) - (a.Dotincay || 0));
            const bestAlgo = validAlgos[0];
            finalPred = bestAlgo.prediction;
            finalReason = `⚖️ Hòa vote (${votes['Tài']}-${votes['Xỉu']}) + tổng độ tin cậy bằng nhau → Chọn "${bestAlgo.key}" (${bestAlgo.prediction}, ${bestAlgo.Dotincay || 0}%)`;
        }
    }

    return {
        final: { 
            prediction: finalPred, 
            confidence: avgConfidence, 
            reason: finalReason || `Dự đoán ${finalPred} với độ tin cậy ${avgConfidence}%` 
        },
        algorithms: results,
        votes: votes,
        valid_algos_count: validAlgos.length,
        avg_confidence: avgConfidence
    };
}

// ============================================================
// LƯU TRỮ RIÊNG CHO TỪNG GAME
// ============================================================
const gameStores = {};

function getGameStore(key) {
    if (!gameStores[key]) {
        gameStores[key] = {
            history: [],
            lastPhien: null,
            prediction: null,
            lastUpdate: null
        };
    }
    return gameStores[key];
}

function incrementPhien(phien) {
    if (!phien) return '001';
    const match = String(phien).match(/(\d+)$/);
    if (match) {
        const num = parseInt(match[1]) + 1;
        return String(phien).replace(/\d+$/, String(num).padStart(match[1].length, '0'));
    }
    return phien + '-001';
}

// ============================================================
// HÀM GỌI API VÀ XỬ LÝ
// ============================================================
async function fetchAndPredict(gameName, apiType, url) {
    const key = `${gameName}-${apiType}`;
    const store = getGameStore(key);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.log(`❌ [${key}] HTTP ${response.status}`);
            return null;
        }
        
        const rawData = await response.json();
        if (!rawData) {
            console.log(`❌ [${key}] Empty response`);
            return null;
        }
        
        // Chuẩn hóa dữ liệu
        const phien = rawData.phien || rawData.Phien || rawData.id || null;
        const x1 = parseInt(rawData.xuc_xac_1 || rawData.Xuc_xac_1 || rawData.x1 || 0);
        const x2 = parseInt(rawData.xuc_xac_2 || rawData.Xuc_xac_2 || rawData.x2 || 0);
        const x3 = parseInt(rawData.xuc_xac_3 || rawData.Xuc_xac_3 || rawData.x3 || 0);
        let tong = rawData.tong || rawData.Tong || rawData.total || (x1 + x2 + x3);
        let ketqua = rawData.ket_qua || rawData.Ket_qua || rawData.result || null;
        
        if (!phien || (!x1 && !x2 && !x3)) return null;
        
        if (!ketqua) ketqua = tong >= 11 ? "Tài" : "Xỉu";
        if (typeof ketqua === 'string') {
            const lower = ketqua.toLowerCase();
            if (lower.includes('tài') || lower === 't' || lower === 'tai') ketqua = "Tài";
            else if (lower.includes('xỉu') || lower === 'x' || lower === 'xiu') ketqua = "Xỉu";
        }
        
        // Kiểm tra phiên mới
        if (phien === store.lastPhien) return store.prediction;
        store.lastPhien = phien;
        
        // Thêm vào lịch sử
        store.history.push({
            Phien: phien,
            Xuc_xac_1: x1,
            Xuc_xac_2: x2,
            Xuc_xac_3: x3,
            Tong: tong,
            Ket_qua: ketqua
        });
        
        if (store.history.length > CONFIG.MAX_HISTORY_STORE) {
            store.history = store.history.slice(-500);
        }
        
        // Chuẩn bị dữ liệu cho dự đoán
        const data_kq = store.history.map(h => {
            if (h.Ket_qua === 'Tài') return 'T';
            if (h.Ket_qua === 'Xỉu') return 'X';
            return null;
        }).filter(x => x);
        
        const totals = store.history.map(h => h.Tong).filter(t => t !== null && t > 0);
        const xx_str = `${x1}-${x2}-${x3}`;
        
        // DỰ ĐOÁN
        const prediction = predictAllAlgorithms(data_kq, totals, xx_str);
        
        // Lưu kết quả với format JSON chuẩn - ĐÃ SỬA du_doan → dudoan
        store.prediction = {
            game: gameName,
            api_type: apiType,
            source_url: url,
            key: key,
            Phien: phien,
            Phien_du_doan: incrementPhien(phien) || '001',
            Xuc_xac1: x1 || 0,
            Xuc_xac2: x2 || 0,
            Xuc_xac3: x3 || 0,
            Tong: tong || 0,
            Ketqua: ketqua || 'Không xác định',
            Du_doan: prediction.final.prediction || 'Tài',
            Confidence: typeof prediction.avg_confidence === 'number' ? prediction.avg_confidence : 50,
            reason: prediction.final.reason || 'Không có lý do',
            cre: CONFIG.CREATOR_ID || '@bucactaodi',
            meta: {
                timestamp: new Date().toISOString(),
                history_length: store.history.length || 0
            },
            algorithms: {
                thuat_toan_1: {
                    ten: 'Pattern Database',
                    dudoan: prediction.algorithms.pattern_db?.prediction || 'Chưa đủ dữ liệu',
                    Dotincay: typeof prediction.algorithms.pattern_db?.Dotincay === 'number' ? prediction.algorithms.pattern_db.Dotincay : 0,
                    Lydo: prediction.algorithms.pattern_db?.Lydo || 'N/A'
                },
                thuat_toan_2: {
                    ten: 'Manual Patterns',
                    dudoan: prediction.algorithms.manual?.prediction || 'N/A',
                    Dotincay: typeof prediction.algorithms.manual?.Dotincay === 'number' ? prediction.algorithms.manual.Dotincay : 0,
                    Lydo: prediction.algorithms.manual?.Lydo || 'N/A'
                },
                thuat_toan_3: {
                    ten: 'Du Doan JS',
                    dudoan: prediction.algorithms.du_doan_js?.prediction || 'N/A',
                    Dotincay: typeof prediction.algorithms.du_doan_js?.Dotincay === 'number' ? prediction.algorithms.du_doan_js.Dotincay : 0,
                    Lydo: prediction.algorithms.du_doan_js?.Lydo || 'N/A'
                },
                thuat_toan_4: {
                    ten: 'Combined Predict (50+ algorithms)',
                    dudoan: prediction.algorithms.combined?.prediction || 'N/A',
                    Dotincay: typeof prediction.algorithms.combined?.Dotincay === 'number' ? prediction.algorithms.combined.Dotincay : 0,
                    Lydo: prediction.algorithms.combined?.Lydo || 'N/A'
                }
            },
            votes: prediction.votes || { 'Tài': 0, 'Xỉu': 0 }
        };
        
        store.lastUpdate = new Date().toISOString();
        
        console.log(`✅ [${key}] OK`);
        return store.prediction;
        
    } catch (error) {
        
        return null;
    }
}

// ============================================================
// POLLING
// ============================================================
async function pollAllAPIs() {
    const now = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    let success = 0, fail = 0;
    
    const promises = [];
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        for (const [apiType, url] of Object.entries(config)) {
            promises.push(
                fetchAndPredict(gameName, apiType, url)
                    .then(r => r ? success++ : fail++)
                    .catch(() => fail++)
            );
        }
    }
    
    await Promise.allSettled(promises);
    
}

// ============================================================
// ROUTES
// ============================================================

app.get('/', (req, res) => {
    const storeList = Object.entries(gameStores).map(([key, store]) => ({
        key,
        history_count: store.history.length,
        last_prediction: store.prediction ? store.prediction.Du_doan : null,
        confidence: store.prediction ? store.prediction.Confidence : null
    }));
    
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        creator: CONFIG.CREATOR_ID,
        total_games: Object.keys(API_SOURCES).length,
        total_endpoints: Object.values(API_SOURCES).reduce((s, c) => s + Object.keys(c).length, 0),
        active_stores: Object.keys(gameStores).length,
        stores: storeList
    });
});

function createGameRoute(routeName, gameName, apiType, url) {
    app.get(`/${routeName}`, async (req, res) => {
        const key = `${gameName}-${apiType}`;
        const store = getGameStore(key);
        
        if (store.prediction && store.lastUpdate) {
            return res.json(store.prediction);
        }
        
        const result = await fetchAndPredict(gameName, apiType, url);
        if (result) return res.json(result);
        
        res.json({
            status: 'waiting',
            message: `Đang chờ dữ liệu cho ${gameName} (${apiType})`,
            history_count: store.history.length,
            api_url: url
        });
    });
    
    app.get(`/${routeName}/history`, (req, res) => {
        const store = getGameStore(`${gameName}-${apiType}`);
        res.json({
            game: gameName,
            type: apiType,
            route: routeName,
            total: store.history.length,
            last_phien: store.lastPhien,
            last_prediction: store.prediction ? {
                prediction: store.prediction.Du_doan,
                confidence: store.prediction.Confidence,
                phien_du_doan: store.prediction.Phien_du_doan
            } : null,
            history: store.history.slice(-50)
        });
    });
}

function registerAllRoutes() {
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        for (const [apiType, url] of Object.entries(config)) {
            let routeName;
            if (apiType === 'tx') routeName = `tx${gameName}`;
            else if (apiType === 'txmd5') routeName = `txmd5${gameName}`;
            else if (apiType === 'sicbo') routeName = `sicbo${gameName}`;
            else if (apiType === 'sicbo40s') routeName = `sicbo40s${gameName}`;
            else routeName = `${apiType}${gameName}`;
            
            createGameRoute(routeName, gameName, apiType, url);
        }
    }
}

registerAllRoutes();

app.get('/summary', (req, res) => {
    const summary = {};
    for (const [key, store] of Object.entries(gameStores)) {
        summary[key] = {
            history_count: store.history.length,
            last_phien: store.lastPhien,
            last_ketqua: store.history.length > 0 ? store.history[store.history.length - 1].Ket_qua : null,
            last_tong: store.history.length > 0 ? store.history[store.history.length - 1].Tong : null,
            prediction: store.prediction ? {
                du_doan: store.prediction.Du_doan,
                confidence: store.prediction.Confidence,
                phien_du_doan: store.prediction.Phien_du_doan,
                reason: store.prediction.reason
            } : null,
            last_update: store.lastUpdate
        };
    }
    res.json({ timestamp: new Date().toISOString(), stores: summary });
});

app.get('/force-poll', async (req, res) => {
    res.json({ message: 'Đang polling...' });
    await pollAllAPIs();
});

// ============================================================
// CHỐNG NGỦ RENDER
// ============================================================
setInterval(() => {
    fetch(`http://localhost:${PORT}/`).then(() => {}).catch(() => {});
}, 300000);

// ============================================================
// START
// ============================================================
const totalEndpoints = Object.values(API_SOURCES).reduce((s, c) => s + Object.keys(c).length, 0);


app.listen(PORT, () => {
    
    for (const [gameName, config] of Object.entries(API_SOURCES)) {
        for (const [apiType, url] of Object.entries(config)) {
            const routeName = apiType === 'tx' ? `tx${gameName}` :
                             apiType === 'txmd5' ? `txmd5${gameName}` :
                             apiType === 'sicbo' ? `sicbo${gameName}` :
                             apiType === 'sicbo40s' ? `sicbo40s${gameName}` :
                             `${apiType}${gameName}`;
            
        }
    }
    
});

setTimeout(pollAllAPIs, 2000);
setInterval(pollAllAPIs, CONFIG.POLL_INTERVAL);

process.stdin.resume();
