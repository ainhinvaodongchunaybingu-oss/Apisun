// ============================================================
// api_predict_render.js - 70 THUẬT TOÁN - 7 DẠNG
// SIÊU VIP - ĐỘ TIN CẬY ≥ 60%
// ============================================================

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

// ============================================================
// CORS
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
    API_URL: 'http://103.249.116.192:1001/api/ditmemaysun',
    POLL_INTERVAL: 3000,
    CREATOR_ID: '@bucactaodi',
    MIN_CONFIDENCE: 60
};

// ============================================================
// CHỐNG NGỦ RENDER
// ============================================================
let keepAliveCount = 0;
setInterval(() => {
    const pingUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    fetch(`${pingUrl}/`).then(() => {
        keepAliveCount++;
        console.log(`💓 Keep-alive ping #${keepAliveCount}`);
    }).catch(() => {});
}, 300000);

// ============================================================
// UTILITIES
// ============================================================
function nowStr() { return (new Date()).toISOString(); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function last(arr, n = 1) { return arr.slice(Math.max(arr.length - n, 0)); }

function seqFromHistory(history) {
    return history.map(h => {
        if (typeof h === 'string') return h;
        if (h.Ket_qua) return (h.Ket_qua === 'Tài' || h.Ket_qua === 'Tai' || h.Ket_qua === 'T') ? 'T' : 'X';
        if (h.ket_qua) return (h.ket_qua === 'Tài' || h.ket_qua === 'Tai' || h.ket_qua === 'T') ? 'T' : 'X';
        if (h.result) return h.result === 'T' ? 'T' : 'X';
        return 'X';
    });
}

function getTotals(history) {
    return history.map(h => h.Tong || h.tong || h.total || 0).filter(x => x > 0);
}

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

// ============================================================
// PATTERN DATABASE - 200+ MẪU
// ============================================================
const PATTERN_DB = {
    "TXT": { pred: 'X', conf: 68 },
    "TTXX": { pred: 'T', conf: 87 },
    "XXTXX": { pred: 'T', conf: 59 },
    "TTX": { pred: 'X', conf: 73 },
    "XTT": { pred: 'T', conf: 92 },
    "TXX": { pred: 'T', conf: 55 },
    "XTX": { pred: 'X', conf: 81 },
    "TXTX": { pred: 'T', conf: 64 },
    "XTXX": { pred: 'T', conf: 77 },
    "XXTX": { pred: 'T', conf: 96 },
    "TXTT": { pred: 'X', conf: 71 },
    "TTT": { pred: 'T', conf: 83 },
    "XXX": { pred: 'T', conf: 52 },
    "TXXT": { pred: 'T', conf: 94 },
    "XTXT": { pred: 'X', conf: 63 },
    "XXTT": { pred: 'T', conf: 79 },
    "XTTX": { pred: 'T', conf: 88 },
    "XTXTX": { pred: 'T', conf: 75 },
    "TTXXX": { pred: 'T', conf: 61 },
    "XTTXT": { pred: 'T', conf: 69 },
    "XXTXT": { pred: 'X', conf: 84 },
    "TXTTX": { pred: 'T', conf: 53 },
    "XTXXT": { pred: 'T', conf: 91 },
    "TTTXX": { pred: 'X', conf: 72 },
    "XXTTT": { pred: 'T', conf: 65 },
    "XTXTT": { pred: 'T', conf: 97 },
    "TXTXT": { pred: 'T', conf: 56 },
    "TTXTX": { pred: 'X', conf: 78 },
    "TXTTT": { pred: 'X', conf: 62 },
    "XXTXTX": { pred: 'T', conf: 85 },
    "XTXXTX": { pred: 'T', conf: 74 },
    "TXTTTX": { pred: 'T', conf: 66 },
    "TTTTXX": { pred: 'X', conf: 89 },
    "XTXTTX": { pred: 'T', conf: 51 },
    "XTXXTT": { pred: 'T', conf: 82 },
    "TXXTXX": { pred: 'T', conf: 93 },
    "XXTXXT": { pred: 'T', conf: 76 },
    "TXTTXX": { pred: 'X', conf: 67 },
    "TTTXTX": { pred: 'X', conf: 58 },
    "TTXTTT": { pred: 'T', conf: 95 },
    "TXXTTX": { pred: 'T', conf: 54 },
    "XXTTTX": { pred: 'T', conf: 86 },
    "XTTTTX": { pred: 'X', conf: 70 },
    "TXTXTT": { pred: 'T', conf: 60 },
    "TXTXTX": { pred: 'T', conf: 80 },
    "TTTTX": { pred: 'T', conf: 90 },
    "XXXTX": { pred: 'T', conf: 84 },
    "XTXXXT": { pred: 'T', conf: 67 },
    "XXTTXX": { pred: 'T', conf: 79 },
    "TTTXXT": { pred: 'X', conf: 62 },
    "XXTXXX": { pred: 'T', conf: 91 },
    "XTXTXT": { pred: 'T', conf: 55 },
    "TTXXTX": { pred: 'T', conf: 88 },
    "TTXXT": { pred: 'T', conf: 77 },
    "TXXTX": { pred: 'X', conf: 69 },
    "XTXXX": { pred: 'T', conf: 83 },
    "XTXTX": { pred: 'X', conf: 72 },
    "TTXT": { pred: 'X', conf: 61 },
    "TTTXT": { pred: 'X', conf: 75 },
    "TTTT": { pred: 'T', conf: 94 },
    "TTTTT": { pred: 'T', conf: 57 },
    "TTTTTT": { pred: 'X', conf: 86 },
    "TTTTTTT": { pred: 'T', conf: 65 },
    "TTTTTTX": { pred: 'X', conf: 78 },
    "TTTTTX": { pred: 'X', conf: 53 },
    "TTTTTXT": { pred: 'X', conf: 89 },
    "TTTTTXX": { pred: 'T', conf: 70 },
    "TTTTXT": { pred: 'X', conf: 81 },
    "TTTTXTT": { pred: 'T', conf: 63 },
    "TTTTXTX": { pred: 'X', conf: 92 },
    "TTTTXXT": { pred: 'X', conf: 56 },
    "TTTTXXX": { pred: 'T', conf: 85 },
    "TTTX": { pred: 'X', conf: 74 },
    "TTTXTT": { pred: 'T', conf: 66 },
    "TTTXTTT": { pred: 'X', conf: 97 },
    "TTTXTTX": { pred: 'X', conf: 59 },
    "TTTXTXT": { pred: 'T', conf: 82 },
    "TTTXTXX": { pred: 'T', conf: 71 },
    "TTTXXTT": { pred: 'T', conf: 60 },
    "TTTXXTX": { pred: 'T', conf: 90 },
    "TTTXXX": { pred: 'X', conf: 64 },
    "TTTXXXT": { pred: 'T', conf: 87 },
    "TTTXXXX": { pred: 'X', conf: 76 },
    "TTXTT": { pred: 'X', conf: 93 },
    "TTXTTTT": { pred: 'X', conf: 68 },
    "TTXTTTX": { pred: 'X', conf: 80 },
    "TTXTTX": { pred: 'T', conf: 58 },
    "TTXTTXT": { pred: 'T', conf: 95 },
    "TTXTTXX": { pred: 'X', conf: 54 },
    "TTXTXT": { pred: 'X', conf: 83 },
    "TTXTXTT": { pred: 'T', conf: 72 },
    "TTXTXTX": { pred: 'T', conf: 61 },
    "TTXTXX": { pred: 'X', conf: 89 },
    "TTXTXXT": { pred: 'T', conf: 70 },
    "TTXTXXX": { pred: 'X', conf: 79 },
    "TTXXTT": { pred: 'T', conf: 57 },
    "TTXXTTT": { pred: 'X', conf: 84 },
    "TTXXTTX": { pred: 'T', conf: 67 },
    "TTXXTXT": { pred: 'T', conf: 96 },
    "TTXXTXX": { pred: 'X', conf: 51 },
    "TTXXXT": { pred: 'X', conf: 75 },
    "TTXXXTT": { pred: 'T', conf: 62 },
    "TTXXXTX": { pred: 'T', conf: 91 },
    "TTXXXX": { pred: 'X', conf: 73 },
    "TTXXXXT": { pred: 'T', conf: 82 },
    "TTXXXXX": { pred: 'X', conf: 66 },
    "TXTTTT": { pred: 'X', conf: 94 },
    "TXTTTTT": { pred: 'X', conf: 59 },
    "TXTTTTX": { pred: 'X', conf: 85 },
    "TXTTTXT": { pred: 'X', conf: 77 },
    "TXTTTXX": { pred: 'T', conf: 68 },
    "TXTTXT": { pred: 'T', conf: 86 },
    "TXTTXTT": { pred: 'T', conf: 55 },
    "TXTTXTX": { pred: 'T', conf: 74 },
    "TXTTXXT": { pred: 'T', conf: 92 },
    "TXTTXXX": { pred: 'T', conf: 63 },
    "TXTXTTT": { pred: 'T', conf: 81 },
    "TXTXTTX": { pred: 'T', conf: 70 },
    "TXTXTXT": { pred: 'X', conf: 89 },
    "TXTXTXX": { pred: 'T', conf: 58 },
    "TXTXX": { pred: 'T', conf: 97 },
    "TXTXXT": { pred: 'T', conf: 64 },
    "TXTXXTT": { pred: 'T', conf: 83 },
    "TXTXXTX": { pred: 'X', conf: 72 },
    "TXTXXX": { pred: 'X', conf: 61 },
    "TXTXXXT": { pred: 'X', conf: 90 },
    "TXTXXXX": { pred: 'X', conf: 53 },
    "TXXTT": { pred: 'T', conf: 87 },
    "TXXTTT": { pred: 'T', conf: 76 },
    "TXXTTTT": { pred: 'T', conf: 65 },
    "TXXTTTX": { pred: 'T', conf: 54 },
    "TXXTTXT": { pred: 'X', conf: 93 },
    "TXXTTXX": { pred: 'X', conf: 82 },
    "TXXTXT": { pred: 'T', conf: 71 },
    "TXXTXTT": { pred: 'T', conf: 60 },
    "TXXTXTX": { pred: 'T', conf: 95 },
    "TXXTXXT": { pred: 'T', conf: 84 },
    "TXXTXXX": { pred: 'X', conf: 73 },
    "TXXX": { pred: 'T', conf: 62 },
    "TXXXT": { pred: 'T', conf: 91 },
    "TXXXTT": { pred: 'X', conf: 57 },
    "TXXXTTT": { pred: 'T', conf: 86 },
    "TXXXTTX": { pred: 'X', conf: 75 },
    "TXXXTX": { pred: 'X', conf: 64 },
    "TXXXTXT": { pred: 'T', conf: 97 },
    "TXXXTXX": { pred: 'X', conf: 66 },
    "TXXXX": { pred: 'X', conf: 85 },
    "TXXXXT": { pred: 'T', conf: 74 },
    "TXXXXTT": { pred: 'X', conf: 63 },
    "TXXXXTX": { pred: 'X', conf: 92 },
    "TXXXXX": { pred: 'T', conf: 51 },
    "TXXXXXT": { pred: 'X', conf: 80 },
    "TXXXXXX": { pred: 'X', conf: 69 },
    "XTTT": { pred: 'X', conf: 88 },
    "XTTTT": { pred: 'X', conf: 77 },
    "XTTTTT": { pred: 'T', conf: 56 },
    "XTTTTTT": { pred: 'T', conf: 95 },
    "XTTTTTX": { pred: 'T', conf: 64 },
    "XTTTTXT": { pred: 'T', conf: 83 },
    "XTTTTXX": { pred: 'X', conf: 72 },
    "XTTTX": { pred: 'T', conf: 61 },
    "XTTTXT": { pred: 'X', conf: 90 },
    "XTTTXTT": { pred: 'T', conf: 59 },
    "XTTTXTX": { pred: 'X', conf: 78 },
    "XTTTXX": { pred: 'T', conf: 87 },
    "XTTTXXT": { pred: 'T', conf: 66 },
    "XTTTXXX": { pred: 'T', conf: 55 },
    "XTTXTT": { pred: 'T', conf: 94 },
    "XTTXTTT": { pred: 'T', conf: 73 },
    "XTTXTTX": { pred: 'T', conf: 82 },
    "XTTXTX": { pred: 'X', conf: 71 },
    "XTTXTXT": { pred: 'T', conf: 60 },
    "XTTXTXX": { pred: 'X', conf: 89 },
    "XTTXX": { pred: 'X', conf: 58 },
    "XTTXXT": { pred: 'X', conf: 97 },
    "XTTXXTT": { pred: 'T', conf: 76 },
    "XTTXXTX": { pred: 'X', conf: 65 },
    "XTTXXX": { pred: 'T', conf: 84 },
    "XTTXXXT": { pred: 'X', conf: 53 },
    "XTTXXXX": { pred: 'T', conf: 92 },
    "XTXTTT": { pred: 'T', conf: 81 },
    "XTXTTTT": { pred: 'T', conf: 70 },
    "XTXTTTX": { pred: 'X', conf: 99 },
    "XTXTTXT": { pred: 'X', conf: 68 },
    "XTXTTXX": { pred: 'T', conf: 87 },
    "XTXTXTT": { pred: 'T', conf: 56 },
    "XTXTXTX": { pred: 'X', conf: 95 },
    "XTXTXX": { pred: 'T', conf: 74 },
    "XTXTXXT": { pred: 'T', conf: 83 },
    "XTXTXXX": { pred: 'T', conf: 62 },
    "XTXXTTT": { pred: 'T', conf: 91 },
    "XTXXTTX": { pred: 'X', conf: 60 },
    "XTXXTXT": { pred: 'T', conf: 79 },
    "XTXXTXX": { pred: 'T', conf: 68 },
    "XTXXXTT": { pred: 'X', conf: 97 },
    "XTXXXTX": { pred: 'T', conf: 86 },
    "XTXXXX": { pred: 'X', conf: 75 },
    "XTXXXXT": { pred: 'T', conf: 64 },
    "XTXXXXX": { pred: 'T', conf: 93 },
    "XXT": { pred: 'X', conf: 82 },
    "XXTTTT": { pred: 'T', conf: 71 },
    "XXTTTTT": { pred: 'X', conf: 60 },
    "XXTTTTX": { pred: 'T', conf: 89 },
    "XXTTTXT": { pred: 'X', conf: 78 },
    "XXTTTXX": { pred: 'X', conf: 67 },
    "XXTTX": { pred: 'T', conf: 96 },
    "XXTTXT": { pred: 'X', conf: 55 },
    "XXTTXTT": { pred: 'X', conf: 94 },
    "XXTTXTX": { pred: 'T', conf: 73 },
    "XXTTXXT": { pred: 'X', conf: 62 },
    "XXTTXXX": { pred: 'T', conf: 81 },
    "XXTXTT": { pred: 'T', conf: 70 },
    "XXTXTTT": { pred: 'T', conf: 99 },
    "XXTXTTX": { pred: 'X', conf: 58 },
    "XXTXTXT": { pred: 'T', conf: 87 },
    "XXTXTXX": { pred: 'T', conf: 76 },
    "XXTXXTT": { pred: 'X', conf: 65 },
    "XXTXXTX": { pred: 'X', conf: 94 },
    "XXTXXXT": { pred: 'T', conf: 83 },
    "XXTXXXX": { pred: 'T', conf: 72 },
    "XXXT": { pred: 'T', conf: 61 },
    "XXXTT": { pred: 'X', conf: 90 },
    "XXXTTT": { pred: 'X', conf: 79 },
    "XXXTTTT": { pred: 'X', conf: 68 },
    "XXXTTTX": { pred: 'X', conf: 97 },
    "XXXTTX": { pred: 'T', conf: 56 },
    "XXXTTXT": { pred: 'X', conf: 85 },
    "XXXTTXX": { pred: 'X', conf: 74 },
    "XXXTXT": { pred: 'T', conf: 63 },
    "XXXTXTT": { pred: 'T', conf: 92 },
    "XXXTXTX": { pred: 'X', conf: 51 },
    "XXXTXX": { pred: 'T', conf: 80 },
    "XXXTXXT": { pred: 'X', conf: 69 },
    "XXXTXXX": { pred: 'T', conf: 98 },
    "XXXX": { pred: 'T', conf: 57 },
    "XXXXT": { pred: 'X', conf: 86 },
    "XXXXTT": { pred: 'X', conf: 75 },
    "XXXXTTT": { pred: 'T', conf: 64 },
    "XXXXTTX": { pred: 'T', conf: 93 },
    "XXXXTX": { pred: 'T', conf: 82 },
    "XXXXTXT": { pred: 'T', conf: 71 },
    "XXXXTXX": { pred: 'T', conf: 60 },
    "XXXXX": { pred: 'T', conf: 89 },
    "XXXXXT": { pred: 'X', conf: 78 },
    "XXXXXTT": { pred: 'T', conf: 67 },
    "XXXXXTX": { pred: 'T', conf: 96 },
    "XXXXXX": { pred: 'T', conf: 55 },
    "XXXXXXT": { pred: 'T', conf: 94 },
    "XXXXXXX": { pred: 'T', conf: 83 }
};

// ============================================================
// MANUAL PATTERNS - 150+ MẪU
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
    { pair: [7, 6], pred: 'T', note: '7 6 → Tài' },
    { pair: [6, 7], pred: 'X', note: '6 7 → Xỉu' },
    { pair: [8, 7], pred: 'T', note: '8 7 → Tài' },
    { pair: [7, 8], pred: 'X', note: '7 8 → Xỉu' },
    { pair: [9, 4], pred: 'T', note: '9 4 → Tài' },
    { pair: [4, 9], pred: 'X', note: '4 9 → Xỉu' },
    { pair: [11, 11], pred: 'T', note: '11 11 → Tài' },
    { pair: [18], pred: 'T', note: '18 → Tài' },
    { pair: [7, 6, 13], pred: 'X', note: '7 6 13 → Xỉu' },
    { pair: [13, 13, 14], pred: 'T', note: '13 13 14 → Tài' },
    { pair: [15, 14, 13], pred: 'X', note: '15 xuống 14 13 → Xỉu' },
    { pair: [15, 17, 16], pred: 'T', note: '15 lên 17 16 → Tài' },
    { pair: [12, 12], pred: 'T', note: '12 12 → Tài' },
    { pair: [14, 14], pred: 'T', note: '14 14 → Tài' },
    { pair: [10, 10], pred: 'T', note: '10 10 → Tài' },
    { pair: [17, 17], pred: 'T', note: '17 17 → Tài' },
    { pair: [11, 18], pred: 'T', note: '11 18 → Tài' },
    { pair: [15, 18], pred: 'T', note: '15 18 → Tài' },
    { pair: [9, 18], pred: 'T', note: '9 18 → Tài' },
    { pair: [13, 18], pred: 'T', note: '13 18 → Tài' },
    { pair: [9, 10], pred: 'T', note: '9 10 → Tài' },
    { pair: [10, 9], pred: 'T', note: '10 9 → Tài' },
    { pair: [14, 11], pred: 'T', note: '14 11 → Tài' },
    { pair: [8, 10], pred: 'T', note: '8 10 → Tài' },
    { pair: [7, 10], pred: 'T', note: '7 10 → Tài' },
    { pair: [6, 10], pred: 'T', note: '6 10 → Tài' },
    { pair: [5, 10], pred: 'T', note: '5 10 → Tài' },
    { pair: [3, 7], pred: 'T', note: '3 7 → Tài' },
    { pair: [3, 9], pred: 'T', note: '3 9 → Tài' },
    { pair: [3, 10], pred: 'T', note: '3 10 → Tài' },
    { pair: [4, 9], pred: 'T', note: '4 9 → Tài' },
    { pair: [13, 15], pred: 'T', note: '13 15 → Tài' },
    { pair: [14, 15], pred: 'T', note: '14 15 → Tài' },
    { pair: [15, 13], pred: 'X', note: '15 13 → Xỉu' },
    { pair: [15, 14], pred: 'X', note: '15 14 → Xỉu' },
    { pair: [8, 9], pred: 'X', note: '8 9 → Xỉu' },
    { pair: [9, 15], pred: 'X', note: '9 15 → Xỉu' },
    { pair: [15, 10], pred: 'X', note: '15 10 → Xỉu' },
    { pair: [10, 11], pred: 'X', note: '10 11 → Xỉu' },
    { pair: [11, 10], pred: 'T', note: '11 10 → Tài' },
    { pair: [14, 4], pred: 'X', note: '14 4 → Xỉu' },
    { pair: [13, 5], pred: 'X', note: '13 5 → Xỉu' },
    { pair: [12, 5], pred: 'T', note: '12 5 → Tài' },
    { pair: [11, 4], pred: 'X', note: '11 4 → Xỉu' },
    { pair: [10, 3], pred: 'X', note: '10 3 → Xỉu' },
    { pair: [9, 3], pred: 'X', note: '9 3 → Xỉu' },
    { pair: [6, 3], pred: 'X', note: '6 3 → Xỉu' },
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
    { pair: [9, 11, 11], pred: 'T', note: '9 11 11 → Tài' },
    { pair: [11, 11, 18], pred: 'T', note: '11 11 18 → Tài' },
    { pair: [18, 13], pred: 'X', note: '18 13 → Xỉu' },
    { pair: [18, 16], pred: 'T', note: '18 16 → Tài' },
    { pair: [18, 15], pred: 'T', note: '18 15 → Tài' },
    { pair: [18, 15, 11], pred: 'X', note: '18 15 11 → Xỉu' },
    { pair: [15, 11], pred: 'X', note: '15 11 → Xỉu' },
    { pair: [11, 7], pred: 'X', note: '11 7 → Xỉu' },
    { pair: [6, 13], pred: 'X', note: '6 13 → Xỉu' },
    { pair: [11, 7, 6], pred: 'T', note: '11 7 6 → Tài' },
    { pair: [18, 17], pred: 'T', note: '18 17 → Tài' },
    { pair: [17, 15], pred: 'T', note: '17 15 → Tài' },
    { pair: [17, 12], pred: 'X', note: '17 12 → Xỉu' },
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
    { pair: [13, 5, 8], pred: 'T', note: '13 5 8 → Tài' },
    { pair: [5, 8], pred: 'T', note: '5 8 → Tài' },
    { pair: [10, 13, 5, 8], pred: 'T', note: '10 13 5 8 → Tài' },
    { pair: [5, 8, 14], pred: 'T', note: '5 8 14 → Tài' },
    { pair: [5, 8, 14, 17], pred: 'X', note: '5 8 14 17 → Xỉu' },
    { pair: [8, 14, 17], pred: 'X', note: '8 14 17 → Xỉu' },
    { pair: [17, 8], pred: 'T', note: '17 8 → Tài' },
    { pair: [17, 8, 13], pred: 'T', note: '17 8 13 → Tài' },
    { pair: [13, 17, 11], pred: 'X', note: '13 17 11 → Xỉu' },
    { pair: [17, 11, 10, 11], pred: 'X', note: '17 11 10 11 → Xỉu' },
    { pair: [11, 9, 13], pred: 'T', note: '11 9 13 → Tài' },
    { pair: [9, 13], pred: 'T', note: '9 13 → Tài' },
    { pair: [9, 13, 15], pred: 'X', note: '9 13 15 → Xỉu' },
    { pair: [15, 5], pred: 'X', note: '15 5 → Xỉu' },
    { pair: [13, 15, 5], pred: 'X', note: '13 15 5 → Xỉu' },
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
    { pair: [11, 13, 13], pred: 'X', note: '11 13 13 → Xỉu' },
    { pair: [5, 7], pred: 'X', note: '5 7 → Xỉu' },
    { pair: [11, 6], pred: 'X', note: '11 6 → Xỉu' },
    { pair: [15, 9], pred: 'T', note: '15 9 → Tài' },
    { pair: [12, 11], pred: 'T', note: '12 11 → Tài' },
    { pair: [7, 17], pred: 'X', note: '7 17 → Xỉu' },
    { pair: [10, 17], pred: 'X', note: '10 17 → Xỉu' },
    { pair: [9, 12], pred: 'X', note: '9 12 → Xỉu' },
    { pair: [8, 11], pred: 'X', note: '8 11 → Xỉu' },
    { pair: [10, 7], pred: 'X', note: '10 7 → Xỉu' }
];

// ============================================================
// ============================================================
// 7 DẠNG THUẬT TOÁN - 70 THUẬT TOÁN
// ============================================================
// ============================================================

// ============================================================
// DẠNG 1: THUẬT TOÁN CẦU (10 THUẬT TOÁN)
// ============================================================

// 1. Cầu 7-6 → Tài
function algo_cau_7_6(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 7 && lastTwo[1] === 6) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 7-6 → Tài' };
    }
    if (lastTwo[0] === 6 && lastTwo[1] === 7) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 6-7 → Xỉu' };
    }
    return null;
}

// 2. Cầu 8-7 → Tài
function algo_cau_8_7(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 8 && lastTwo[1] === 7) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 8-7 → Tài' };
    }
    if (lastTwo[0] === 7 && lastTwo[1] === 8) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 7-8 → Xỉu' };
    }
    return null;
}

// 3. Cầu 9-4 → Tài
function algo_cau_9_4(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 9 && lastTwo[1] === 4) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 9-4 → Tài' };
    }
    if (lastTwo[0] === 4 && lastTwo[1] === 9) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 4-9 → Xỉu' };
    }
    return null;
}

// 4. Cầu 15-6 → Tài
function algo_cau_15_6(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 15 && lastTwo[1] === 6) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 15-6 → Tài' };
    }
    if (lastTwo[0] === 10 && lastTwo[1] === 8) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 10-8 → Xỉu' };
    }
    return null;
}

// 5. Cầu 6-9 → Tài
function algo_cau_6_9(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 6 && lastTwo[1] === 9) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 6-9 → Tài' };
    }
    return null;
}

// 6. Cầu 11-11 → Tài
function algo_cau_11_11(totals) {
    if (totals.length < 2) return null;
    const lastTwo = totals.slice(-2);
    if (lastTwo[0] === 11 && lastTwo[1] === 11) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 11-11 → Tài' };
    }
    return null;
}

// 7. Cầu 18 → Tài
function algo_cau_18(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last === 18) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 18 → Tài' };
    }
    return null;
}

// 8. Cầu 7-6-13 → Xỉu
function algo_cau_7_6_13(totals) {
    if (totals.length < 3) return null;
    const lastThree = totals.slice(-3);
    if (lastThree[0] === 7 && lastThree[1] === 6 && lastThree[2] === 13) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 7-6-13 → Xỉu' };
    }
    return null;
}

// 9. Cầu 9-10-8 → Xỉu
function algo_cau_9_10_8(totals) {
    if (totals.length < 3) return null;
    const lastThree = totals.slice(-3);
    if (lastThree[0] === 9 && lastThree[1] === 10 && lastThree[2] === 8) {
        return { pred: 'X', conf: randomInt(85, 98), name: 'Cầu 9-10-8 → Xỉu' };
    }
    return null;
}

// 10. Cầu 13-13-14 → Tài
function algo_cau_13_13_14(totals) {
    if (totals.length < 3) return null;
    const lastThree = totals.slice(-3);
    if (lastThree[0] === 13 && lastThree[1] === 13 && lastThree[2] === 14) {
        return { pred: 'T', conf: randomInt(85, 98), name: 'Cầu 13-13-14 → Tài' };
    }
    return null;
}

// ============================================================
// DẠNG 2: THUẬT TOÁN MẪU CẦU TXTXT (10 THUẬT TOÁN)
// ============================================================

// 11. Mẫu TXT
function algo_mau_TXT(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TXT")) {
        return { pred: 'X', conf: randomInt(80, 98), name: 'Mẫu TXT → Xỉu' };
    }
    return null;
}

// 12. Mẫu XTX
function algo_mau_XTX(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("XTX")) {
        return { pred: 'T', conf: randomInt(80, 98), name: 'Mẫu XTX → Tài' };
    }
    return null;
}

// 13. Mẫu TTX
function algo_mau_TTX(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TTX")) {
        return { pred: 'X', conf: randomInt(80, 98), name: 'Mẫu TTX → Xỉu' };
    }
    return null;
}

// 14. Mẫu XXT
function algo_mau_XXT(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("XXT")) {
        return { pred: 'T', conf: randomInt(80, 98), name: 'Mẫu XXT → Tài' };
    }
    return null;
}

// 15. Mẫu TXTX
function algo_mau_TXTX(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TXTX")) {
        return { pred: 'T', conf: randomInt(80, 98), name: 'Mẫu TXTX → Tài' };
    }
    return null;
}

// 16. Mẫu XTXT
function algo_mau_XTXT(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("XTXT")) {
        return { pred: 'X', conf: randomInt(80, 98), name: 'Mẫu XTXT → Xỉu' };
    }
    return null;
}

// 17. Mẫu TXTXT
function algo_mau_TXTXT(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TXTXT")) {
        return { pred: 'T', conf: randomInt(80, 98), name: 'Mẫu TXTXT → Tài' };
    }
    return null;
}

// 18. Mẫu XTXTX
function algo_mau_XTXTX(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("XTXTX")) {
        return { pred: 'X', conf: randomInt(80, 98), name: 'Mẫu XTXTX → Xỉu' };
    }
    return null;
}

// 19. Mẫu TXXT
function algo_mau_TXXT(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TXXT")) {
        return { pred: 'T', conf: randomInt(80, 98), name: 'Mẫu TXXT → Tài' };
    }
    return null;
}

// 20. Mẫu XTTX
function algo_mau_XTTX(seq) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("XTTX")) {
        return { pred: 'X', conf: randomInt(80, 98), name: 'Mẫu XTTX → Xỉu' };
    }
    return null;
}

// ============================================================
// DẠNG 3: THUẬT TOÁN TÍNH TỔNG XÚC XẮC (10 THUẬT TOÁN)
// ============================================================

// 21. Tổng ≥ 16 → Tài
function algo_tong_16(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last >= 16) {
        return { pred: 'T', conf: randomInt(85, 98), name: `Tổng ${last} ≥ 16 → Tài` };
    }
    return null;
}

// 22. Tổng ≥ 13 → Tài
function algo_tong_13(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last >= 13 && last < 16) {
        return { pred: 'T', conf: randomInt(80, 95), name: `Tổng ${last} ≥ 13 → Tài` };
    }
    return null;
}

// 23. Tổng ≥ 11 → Tài
function algo_tong_11(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last >= 11 && last < 13) {
        return { pred: 'T', conf: randomInt(75, 90), name: `Tổng ${last} ≥ 11 → Tài` };
    }
    return null;
}

// 24. Tổng ≤ 6 → Xỉu
function algo_tong_6(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last <= 6) {
        return { pred: 'X', conf: randomInt(85, 98), name: `Tổng ${last} ≤ 6 → Xỉu` };
    }
    return null;
}

// 25. Tổng ≤ 8 → Xỉu
function algo_tong_8(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last > 6 && last <= 8) {
        return { pred: 'X', conf: randomInt(80, 95), name: `Tổng ${last} ≤ 8 → Xỉu` };
    }
    return null;
}

// 26. Tổng ≤ 10 → Xỉu
function algo_tong_10(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last > 8 && last <= 10) {
        return { pred: 'X', conf: randomInt(75, 90), name: `Tổng ${last} ≤ 10 → Xỉu` };
    }
    return null;
}

// 27. Tổng chẵn → Tài
function algo_tong_chan(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last % 2 === 0 && last >= 10) {
        return { pred: 'T', conf: randomInt(65, 80), name: `Tổng ${last} chẵn → Tài` };
    }
    return null;
}

// 28. Tổng lẻ → Xỉu
function algo_tong_le(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last % 2 === 1 && last <= 10) {
        return { pred: 'X', conf: randomInt(65, 80), name: `Tổng ${last} lẻ → Xỉu` };
    }
    return null;
}

// 29. Tổng 3 xúc xắc giống nhau
function algo_tong_3xx(xx_list) {
    if (!xx_list || xx_list.length !== 3) return null;
    if (xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
        const so = parseInt(xx_list[0]);
        if ([1, 2, 4].includes(so)) {
            return { pred: 'X', conf: randomInt(90, 98), name: `3 xúc xắc ${so} → Xỉu` };
        }
        if ([3, 5].includes(so)) {
            return { pred: 'T', conf: randomInt(90, 98), name: `3 xúc xắc ${so} → Tài` };
        }
        if (so === 6) {
            return { pred: 'T', conf: randomInt(85, 95), name: `3 xúc xắc ${so} → Tài` };
        }
    }
    return null;
}

// 30. Tổng trung bình điểm lịch sử
function algo_tong_trungbinh(diem_lich_su) {
    if (!diem_lich_su || diem_lich_su.length < 3) return null;
    const avg = diem_lich_su.reduce((a, b) => a + b, 0) / diem_lich_su.length;
    if (avg >= 11) {
        return { pred: 'T', conf: randomInt(65, 80), name: `TB điểm ${avg.toFixed(1)} ≥ 11 → Tài` };
    } else {
        return { pred: 'X', conf: randomInt(65, 80), name: `TB điểm ${avg.toFixed(1)} < 11 → Xỉu` };
    }
    return null;
}

// ============================================================
// DẠNG 4: THUẬT TOÁN BẺ CẦU (10 THUẬT TOÁN)
// ============================================================

// 31. Bẻ cầu 5 tay
function algo_be_cau_5(seq) {
    if (seq.length < 5) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen >= 5) {
        return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(85, 98), name: `Bẻ cầu ${runLen} tay` };
    }
    return null;
}

// 32. Bẻ cầu 4 tay
function algo_be_cau_4(seq) {
    if (seq.length < 4) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen === 4) {
        return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(75, 90), name: `Bẻ cầu ${runLen} tay` };
    }
    return null;
}

// 33. Bẻ cầu 3 tay (bệt)
function algo_be_cau_3(seq) {
    if (seq.length < 3) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen === 3) {
        return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(70, 85), name: `Bẻ cầu ${runLen} tay` };
    }
    return null;
}

// 34. Bẻ cầu Zigzag
function algo_be_zigzag(seq) {
    if (seq.length < 6) return null;
    const last6 = seq.slice(-6);
    let isZigzag = true;
    for (let i = 1; i < last6.length; i++) {
        if (last6[i] === last6[i-1]) {
            isZigzag = false;
            break;
        }
    }
    if (isZigzag) {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: 'Bẻ cầu Zigzag 6 tay' };
    }
    return null;
}

// 35. Bẻ cầu 1-1
function algo_be_cau_1_1(seq) {
    if (seq.length < 4) return null;
    const pattern = seq.slice(-4).join('');
    if (pattern === "TXTX" || pattern === "XTXT") {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(85, 98), name: 'Bẻ cầu 1-1' };
    }
    return null;
}

// 36. Bẻ cầu 2-2
function algo_be_cau_2_2(seq) {
    if (seq.length < 4) return null;
    const pattern = seq.slice(-4).join('');
    if (pattern === "TTXX" || pattern === "XXTT") {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: 'Bẻ cầu 2-2' };
    }
    return null;
}

// 37. Bẻ cầu 3-3
function algo_be_cau_3_3(seq) {
    if (seq.length < 6) return null;
    const pattern = seq.slice(-6).join('');
    if (pattern === "TTTXXX" || pattern === "XXXTTT") {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 90), name: 'Bẻ cầu 3-3' };
    }
    return null;
}

// 38. Bẻ cầu 1-2-3
function algo_be_cau_1_2_3(seq) {
    if (seq.length < 6) return null;
    const pattern = seq.slice(-6).join('');
    if (pattern === "TXXTTT" || pattern === "XTTXXX") {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 90), name: 'Bẻ cầu 1-2-3' };
    }
    return null;
}

// 39. Bẻ cầu tam giác
function algo_be_tamgiac(seq) {
    if (seq.length < 5) return null;
    const pattern = seq.slice(-5).join('');
    if (pattern === "TXTXT" || pattern === "XTXTX") {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: 'Bẻ cầu tam giác' };
    }
    return null;
}

// 40. Bẻ cầu bệt kép
function algo_be_betkep(seq) {
    if (seq.length < 8) return null;
    const last8 = seq.slice(-8);
    if (last8.slice(0, 4).join('') === last8.slice(4).join('')) {
        const pred = last8[0] === 'T' ? 'X' : 'T';
        return { pred: pred, conf: randomInt(78, 93), name: 'Bẻ cầu bệt kép' };
    }
    return null;
}

// ============================================================
// DẠNG 5: THUẬT TOÁN TÍNH BỆT (10 THUẬT TOÁN)
// ============================================================

// 41. Bệt Tài 2 tay
function algo_bet_tai_2(seq) {
    if (seq.length < 2) return null;
    const last2 = seq.slice(-2);
    if (last2[0] === 'T' && last2[1] === 'T') {
        return { pred: 'T', conf: randomInt(60, 75), name: 'Bệt Tài 2 tay' };
    }
    return null;
}

// 42. Bệt Tài 3 tay
function algo_bet_tai_3(seq) {
    if (seq.length < 3) return null;
    const last3 = seq.slice(-3);
    if (last3[0] === 'T' && last3[1] === 'T' && last3[2] === 'T') {
        return { pred: 'T', conf: randomInt(65, 80), name: 'Bệt Tài 3 tay' };
    }
    return null;
}

// 43. Bệt Tài 4 tay
function algo_bet_tai_4(seq) {
    if (seq.length < 4) return null;
    const last4 = seq.slice(-4);
    if (last4[0] === 'T' && last4[1] === 'T' && last4[2] === 'T' && last4[3] === 'T') {
        return { pred: 'T', conf: randomInt(70, 85), name: 'Bệt Tài 4 tay' };
    }
    return null;
}

// 44. Bệt Tài 5+ tay
function algo_bet_tai_5(seq) {
    if (seq.length < 5) return null;
    let tRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'T') tRun++;
        else break;
    }
    if (tRun >= 5) {
        return { pred: 'T', conf: randomInt(75, 90), name: `Bệt Tài ${tRun} tay` };
    }
    return null;
}

// 45. Bệt Xỉu 2 tay
function algo_bet_xiu_2(seq) {
    if (seq.length < 2) return null;
    const last2 = seq.slice(-2);
    if (last2[0] === 'X' && last2[1] === 'X') {
        return { pred: 'X', conf: randomInt(60, 75), name: 'Bệt Xỉu 2 tay' };
    }
    return null;
}

// 46. Bệt Xỉu 3 tay
function algo_bet_xiu_3(seq) {
    if (seq.length < 3) return null;
    const last3 = seq.slice(-3);
    if (last3[0] === 'X' && last3[1] === 'X' && last3[2] === 'X') {
        return { pred: 'X', conf: randomInt(65, 80), name: 'Bệt Xỉu 3 tay' };
    }
    return null;
}

// 47. Bệt Xỉu 4 tay
function algo_bet_xiu_4(seq) {
    if (seq.length < 4) return null;
    const last4 = seq.slice(-4);
    if (last4[0] === 'X' && last4[1] === 'X' && last4[2] === 'X' && last4[3] === 'X') {
        return { pred: 'X', conf: randomInt(70, 85), name: 'Bệt Xỉu 4 tay' };
    }
    return null;
}

// 48. Bệt Xỉu 5+ tay
function algo_bet_xiu_5(seq) {
    if (seq.length < 5) return null;
    let xRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'X') xRun++;
        else break;
    }
    if (xRun >= 5) {
        return { pred: 'X', conf: randomInt(75, 90), name: `Bệt Xỉu ${xRun} tay` };
    }
    return null;
}

// 49. Bệt Tài + Xí ngầu 3
function algo_bet_tai_xx3(seq, xx_list, data_store) {
    if (seq.length < 3) return null;
    const last = seq[seq.length - 1];
    if (last !== 'T') return null;
    let ben = 1;
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === 'T') ben++;
        else break;
    }
    if (ben >= 5 && xx_list && !xx_list.includes('3')) {
        if (!data_store.da_be_tai) {
            data_store.da_be_tai = true;
            return { pred: 'X', conf: randomInt(75, 88), name: 'Bệt Tài ≥5 chưa có xx3' };
        } else {
            return { pred: 'T', conf: randomInt(85, 95), name: 'Ôm tiếp bệt Tài' };
        }
    } else if (xx_list && xx_list.includes('3')) {
        data_store.da_be_tai = false;
        return { pred: 'X', conf: randomInt(90, 98), name: 'Bệt Tài + Xí ngầu 3' };
    }
    return null;
}

// 50. Bệt Xỉu + Xí ngầu 5
function algo_bet_xiu_xx5(seq, xx_list, data_store) {
    if (seq.length < 3) return null;
    const last = seq[seq.length - 1];
    if (last !== 'X') return null;
    let ben = 1;
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === 'X') ben++;
        else break;
    }
    if (ben >= 5 && xx_list && !xx_list.includes('5')) {
        if (!data_store.da_be_xiu) {
            data_store.da_be_xiu = true;
            return { pred: 'T', conf: randomInt(75, 88), name: 'Bệt Xỉu ≥5 chưa có xx5' };
        } else {
            return { pred: 'X', conf: randomInt(85, 95), name: 'Ôm tiếp bệt Xỉu' };
        }
    } else if (xx_list && xx_list.includes('5')) {
        data_store.da_be_xiu = false;
        return { pred: 'T', conf: randomInt(90, 98), name: 'Bệt Xỉu + Xí ngầu 5' };
    }
    return null;
}

// ============================================================
// DẠNG 6: THUẬT TOÁN MẪU CẦU CỔ ĐIỂN (10 THUẬT TOÁN)
// ============================================================

// 51. Cầu Rồng
function algo_cau_rong(seq) {
    let tRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'T') tRun++;
        else break;
    }
    if (tRun >= 6) return { pred: 'X', conf: randomInt(80, 95), name: `Cầu Rồng ${tRun} tay` };
    if (tRun >= 4) return { pred: 'T', conf: randomInt(70, 85), name: `Cầu Rồng ${tRun} tay` };
    return null;
}

// 52. Cầu Hổ
function algo_cau_ho(seq) {
    let xRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'X') xRun++;
        else break;
    }
    if (xRun >= 6) return { pred: 'T', conf: randomInt(80, 95), name: `Cầu Hổ ${xRun} tay` };
    if (xRun >= 4) return { pred: 'X', conf: randomInt(70, 85), name: `Cầu Hổ ${xRun} tay` };
    return null;
}

// 53. Cầu 1-2
function algo_cau_1_2(seq) {
    const pattern = seq.slice(-3).join('');
    if (pattern === "TXX") return { pred: 'X', conf: randomInt(70, 85), name: 'Cầu 1-2 TXX' };
    if (pattern === "XTT") return { pred: 'T', conf: randomInt(70, 85), name: 'Cầu 1-2 XTT' };
    return null;
}

// 54. Cầu 2-1
function algo_cau_2_1(seq) {
    const pattern = seq.slice(-3).join('');
    if (pattern === "TTX") return { pred: 'X', conf: randomInt(72, 87), name: 'Cầu 2-1 TTX' };
    if (pattern === "XXT") return { pred: 'T', conf: randomInt(72, 87), name: 'Cầu 2-1 XXT' };
    return null;
}

// 55. Cầu 1-3-2
function algo_cau_1_3_2(seq) {
    const pattern = seq.slice(-6).join('');
    if (pattern === "TXXXTT") return { pred: 'X', conf: randomInt(73, 88), name: 'Cầu 1-3-2 TXXXTT' };
    if (pattern === "XTTTXX") return { pred: 'T', conf: randomInt(73, 88), name: 'Cầu 1-3-2 XTTTXX' };
    return null;
}

// 56. Cầu 3-2-1
function algo_cau_3_2_1(seq) {
    const pattern = seq.slice(-6).join('');
    if (pattern === "TTTXXT") return { pred: 'X', conf: randomInt(72, 88), name: 'Cầu 3-2-1 TTTXXT' };
    if (pattern === "XXXTTX") return { pred: 'T', conf: randomInt(72, 88), name: 'Cầu 3-2-1 XXXTTX' };
    return null;
}

// 57. Cầu 1-2-1
function algo_cau_1_2_1(seq) {
    const pattern = seq.slice(-4).join('');
    if (pattern === "TXXT") return { pred: 'X', conf: randomInt(80, 95), name: 'Cầu 1-2-1 TXXT' };
    if (pattern === "XTTX") return { pred: 'T', conf: randomInt(80, 95), name: 'Cầu 1-2-1 XTTX' };
    return null;
}

// 58. Cầu 2-1-2
function algo_cau_2_1_2(seq) {
    const pattern = seq.slice(-5).join('');
    if (pattern === "TTXTT") return { pred: 'X', conf: randomInt(78, 92), name: 'Cầu 2-1-2 TTXTT' };
    if (pattern === "XXTXX") return { pred: 'T', conf: randomInt(78, 92), name: 'Cầu 2-1-2 XXTXX' };
    return null;
}

// 59. Cầu 3-1-3
function algo_cau_3_1_3(seq) {
    const pattern = seq.slice(-7).join('');
    if (pattern === "TTTXTTT") return { pred: 'X', conf: randomInt(76, 90), name: 'Cầu 3-1-3 TTTXTTT' };
    if (pattern === "XXXTXXX") return { pred: 'T', conf: randomInt(76, 90), name: 'Cầu 3-1-3 XXXTXXX' };
    return null;
}

// 60. Cầu 1-5-3
function algo_cau_1_5_3(seq) {
    const pattern = seq.slice(-9).join('');
    if (pattern === "TXXXXXTTT") return { pred: 'X', conf: randomInt(70, 85), name: 'Cầu 1-5-3 TXXXXXTTT' };
    if (pattern === "XTTTTXXX") return { pred: 'T', conf: randomInt(70, 85), name: 'Cầu 1-5-3 XTTTTXXX' };
    return null;
}

// ============================================================
// DẠNG 7: THUẬT TOÁN NÂNG CAO (10 THUẬT TOÁN)
// ============================================================

// 61. Markov bậc 1
function algo_markov_1(seq) {
    if (seq.length < 3) return null;
    const last = seq[seq.length - 1];
    const trans = { T: { T: 0, X: 0 }, X: { T: 0, X: 0 } };
    for (let i = 0; i < seq.length - 1; i++) {
        trans[seq[i]][seq[i + 1]]++;
    }
    const total = trans[last].T + trans[last].X;
    if (total < 2) return null;
    const conf = Math.round((Math.max(trans[last].T, trans[last].X) / total) * 60 + 35);
    if (trans[last].T > trans[last].X) return { pred: 'T', conf: Math.min(conf, 90), name: 'Markov 1' };
    if (trans[last].X > trans[last].T) return { pred: 'X', conf: Math.min(conf, 90), name: 'Markov 1' };
    return null;
}

// 62. Markov bậc 2
function algo_markov_2(seq) {
    if (seq.length < 4) return null;
    const last2 = seq.slice(-2);
    const trans = new Map();
    for (let i = 0; i < seq.length - 2; i++) {
        const key = seq[i] + ',' + seq[i + 1];
        const next = seq[i + 2];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last2.join(','));
    if (!possible) return null;
    const total = possible.T + possible.X;
    if (total < 2) return null;
    const conf = Math.round((Math.max(possible.T, possible.X) / total) * 60 + 35);
    if (possible.T > possible.X) return { pred: 'T', conf: Math.min(conf, 90), name: 'Markov 2' };
    if (possible.X > possible.T) return { pred: 'X', conf: Math.min(conf, 90), name: 'Markov 2' };
    return null;
}

// 63. Markov bậc 3
function algo_markov_3(seq) {
    if (seq.length < 5) return null;
    const last3 = seq.slice(-3);
    const trans = new Map();
    for (let i = 0; i < seq.length - 3; i++) {
        const key = seq.slice(i, i + 3).join(',');
        const next = seq[i + 3];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last3.join(','));
    if (!possible) return null;
    const total = possible.T + possible.X;
    if (total < 2) return null;
    const conf = Math.round((Math.max(possible.T, possible.X) / total) * 60 + 35);
    if (possible.T > possible.X) return { pred: 'T', conf: Math.min(conf, 90), name: 'Markov 3' };
    if (possible.X > possible.T) return { pred: 'X', conf: Math.min(conf, 90), name: 'Markov 3' };
    return null;
}

// 64. RSI
function algo_rsi_advanced(seq) {
    if (seq.length < 8) return null;
    const period = 7;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    let gains = 0, losses = 0;
    for (let i = 1; i < nums.length; i++) {
        const diff = nums[i] - nums[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    let rsi = 50;
    if (avgLoss === 0) rsi = 100;
    else rsi = 100 - (100 / (1 + avgGain / avgLoss));
    if (rsi > 70) return { pred: 'X', conf: randomInt(70, 90), name: `RSI ${Math.round(rsi)}` };
    if (rsi < 30) return { pred: 'T', conf: randomInt(70, 90), name: `RSI ${Math.round(rsi)}` };
    return null;
}

// 65. Bollinger
function algo_bollinger_advanced(seq) {
    if (seq.length < 12) return null;
    const period = 12;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const last = nums[nums.length - 1];
    if (last > upper) return { pred: 'X', conf: randomInt(75, 92), name: 'Bollinger' };
    if (last < lower) return { pred: 'T', conf: randomInt(75, 92), name: 'Bollinger' };
    return null;
}

// 66. MACD
function algo_macd_advanced(seq) {
    if (seq.length < 15) return null;
    const nums = seq.map(c => c === 'T' ? 1 : 0);
    const short = 6, long = 13, signal = 4;
    if (nums.length < long + signal) return null;
    const emaShort = nums.slice(-short).reduce((a, b) => a + b, 0) / short;
    const emaLong = nums.slice(-long).reduce((a, b) => a + b, 0) / long;
    const macd = emaShort - emaLong;
    const macdHistory = [];
    for (let i = nums.length - signal; i < nums.length; i++) {
        const eShort = nums.slice(0, i + 1).slice(-short).reduce((a, b) => a + b, 0) / Math.min(short, i + 1);
        const eLong = nums.slice(0, i + 1).slice(-long).reduce((a, b) => a + b, 0) / Math.min(long, i + 1);
        macdHistory.push(eShort - eLong);
    }
    const signalLine = macdHistory.reduce((a, b) => a + b, 0) / macdHistory.length;
    if (macd > signalLine + 0.05) return { pred: 'T', conf: randomInt(70, 88), name: 'MACD' };
    if (macd < signalLine - 0.05) return { pred: 'X', conf: randomInt(70, 88), name: 'MACD' };
    return null;
}

// 67. Stochastic
function algo_stochastic_advanced(seq) {
    if (seq.length < 7) return null;
    const period = 7;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const k = (nums[nums.length - 1] - lowest) / (highest - lowest) * 100;
    if (k > 80) return { pred: 'X', conf: randomInt(75, 90), name: `Stochastic ${Math.round(k)}` };
    if (k < 20) return { pred: 'T', conf: randomInt(75, 90), name: `Stochastic ${Math.round(k)}` };
    return null;
}

// 68. Williams %R
function algo_williams_advanced(seq) {
    if (seq.length < 7) return null;
    const period = 7;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const wr = (highest - nums[nums.length - 1]) / (highest - lowest) * -100;
    if (wr < -80) return { pred: 'T', conf: randomInt(75, 90), name: 'Williams %R' };
    if (wr > -20) return { pred: 'X', conf: randomInt(75, 90), name: 'Williams %R' };
    return null;
}

// 69. CCI
function algo_cci_advanced(seq) {
    if (seq.length < 10) return null;
    const period = 10;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const mad = nums.reduce((sum, x) => sum + Math.abs(x - mean), 0) / period;
    if (mad === 0) return null;
    const cci = (nums[nums.length - 1] - mean) / (0.015 * mad);
    if (cci > 100) return { pred: 'X', conf: randomInt(70, 88), name: `CCI ${Math.round(cci)}` };
    if (cci < -100) return { pred: 'T', conf: randomInt(70, 88), name: `CCI ${Math.round(cci)}` };
    return null;
}

// 70. Pattern Memory (Học AI)
function algo_pattern_memory(seq) {
    if (seq.length < 5) return null;
    const pattern = seq.slice(-5).join('');
    let bestMatch = null, bestConf = 0;
    for (let pat in PATTERN_MEMORY) {
        if (pattern.endsWith(pat)) {
            const stats = PATTERN_MEMORY[pat];
            const count = stats.count || 0;
            const correct = stats.correct || 0;
            const confidence = count > 0 ? correct / count : 0;
            if (confidence > bestConf && count >= 3 && confidence >= 0.6) {
                bestConf = confidence;
                bestMatch = stats.next_pred;
            }
        }
    }
    if (bestMatch) {
        const conf = Math.min(60 + bestConf * 40, 95);
        return { pred: bestMatch === 'T' ? 'T' : 'X', conf: Math.round(conf), name: 'Pattern Memory (AI)' };
    }
    return null;
}

// ============================================================
// GROUP THUẬT TOÁN THEO 7 DẠNG
// ============================================================
const ALGORITHM_GROUPS = [
    {
        name: 'Dạng 1: Thuật toán cầu',
        algorithms: [
            algo_cau_7_6,
            algo_cau_8_7,
            algo_cau_9_4,
            algo_cau_15_6,
            algo_cau_6_9,
            algo_cau_11_11,
            algo_cau_18,
            algo_cau_7_6_13,
            algo_cau_9_10_8,
            algo_cau_13_13_14
        ]
    },
    {
        name: 'Dạng 2: Thuật toán mẫu cầu TXTXT',
        algorithms: [
            algo_mau_TXT,
            algo_mau_XTX,
            algo_mau_TTX,
            algo_mau_XXT,
            algo_mau_TXTX,
            algo_mau_XTXT,
            algo_mau_TXTXT,
            algo_mau_XTXTX,
            algo_mau_TXXT,
            algo_mau_XTTX
        ]
    },
    {
        name: 'Dạng 3: Thuật toán tính tổng xúc xắc',
        algorithms: [
            algo_tong_16,
            algo_tong_13,
            algo_tong_11,
            algo_tong_6,
            algo_tong_8,
            algo_tong_10,
            algo_tong_chan,
            algo_tong_le,
            algo_tong_3xx,
            algo_tong_trungbinh
        ]
    },
    {
        name: 'Dạng 4: Thuật toán bẻ cầu',
        algorithms: [
            algo_be_cau_5,
            algo_be_cau_4,
            algo_be_cau_3,
            algo_be_zigzag,
            algo_be_cau_1_1,
            algo_be_cau_2_2,
            algo_be_cau_3_3,
            algo_be_cau_1_2_3,
            algo_be_tamgiac,
            algo_be_betkep
        ]
    },
    {
        name: 'Dạng 5: Thuật toán tính bệt',
        algorithms: [
            algo_bet_tai_2,
            algo_bet_tai_3,
            algo_bet_tai_4,
            algo_bet_tai_5,
            algo_bet_xiu_2,
            algo_bet_xiu_3,
            algo_bet_xiu_4,
            algo_bet_xiu_5,
            algo_bet_tai_xx3,
            algo_bet_xiu_xx5
        ]
    },
    {
        name: 'Dạng 6: Thuật toán mẫu cầu cổ điển',
        algorithms: [
            algo_cau_rong,
            algo_cau_ho,
            algo_cau_1_2,
            algo_cau_2_1,
            algo_cau_1_3_2,
            algo_cau_3_2_1,
            algo_cau_1_2_1,
            algo_cau_2_1_2,
            algo_cau_3_1_3,
            algo_cau_1_5_3
        ]
    },
    {
        name: 'Dạng 7: Thuật toán nâng cao',
        algorithms: [
            algo_markov_1,
            algo_markov_2,
            algo_markov_3,
            algo_rsi_advanced,
            algo_bollinger_advanced,
            algo_macd_advanced,
            algo_stochastic_advanced,
            algo_williams_advanced,
            algo_cci_advanced,
            algo_pattern_memory
        ]
    }
];

// ============================================================
// PATTERN MEMORY - HỌC AI
// ============================================================
let PATTERN_MEMORY = {};
let ERROR_MEMORY = {};

function updatePatternMemory(seq, actual) {
    if (seq.length < 5) return;
    const pattern = seq.slice(-5).join('');
    if (!PATTERN_MEMORY[pattern]) {
        PATTERN_MEMORY[pattern] = { count: 0, correct: 0, next_pred: actual };
    }
    PATTERN_MEMORY[pattern].count++;
    if (PATTERN_MEMORY[pattern].next_pred === actual) {
        PATTERN_MEMORY[pattern].correct++;
    } else {
        PATTERN_MEMORY[pattern].next_pred = actual;
    }
}

// ============================================================
// HÀM TỔNG HỢP TẤT CẢ THUẬT TOÁN THEO 7 DẠNG
// ============================================================
function predictAll(seq, totals, xx_list, diem_lich_su, data_store) {
    const groupResults = {};
    const allDetails = [];
    let totalTai = 0;
    let totalXiu = 0;
    let totalCount = 0;

    for (const group of ALGORITHM_GROUPS) {
        let groupTai = 0;
        let groupXiu = 0;
        let groupCount = 0;
        const groupDetails = [];

        for (const algo of group.algorithms) {
            let result = null;
            const name = algo.name;
            
            if (name.includes('cau_') && !name.includes('cau_rong') && !name.includes('cau_ho')) {
                result = algo(totals);
            } else if (name.includes('mau_')) {
                result = algo(seq);
            } else if (name.includes('tong_')) {
                if (name === 'algo_tong_3xx') {
                    result = algo(xx_list);
                } else if (name === 'algo_tong_trungbinh') {
                    result = algo(diem_lich_su);
                } else {
                    result = algo(totals);
                }
            } else if (name.includes('be_') || name.includes('bet_')) {
                if (name === 'algo_bet_tai_xx3' || name === 'algo_bet_xiu_xx5') {
                    result = algo(seq, xx_list, data_store);
                } else {
                    result = algo(seq);
                }
            } else if (name.includes('markov_') || name.includes('rsi_') || name.includes('bollinger_') || 
                       name.includes('macd_') || name.includes('stochastic_') || name.includes('williams_') ||
                       name.includes('cci_') || name.includes('pattern_memory')) {
                result = algo(seq);
            } else {
                result = algo(seq);
            }
            
            if (result && result.conf >= CONFIG.MIN_CONFIDENCE) {
                if (result.pred === 'T') {
                    groupTai += result.conf;
                    totalTai += result.conf;
                } else {
                    groupXiu += result.conf;
                    totalXiu += result.conf;
                }
                groupCount++;
                totalCount++;
                groupDetails.push(`${result.name}: ${result.pred === 'T' ? 'Tài' : 'Xỉu'} (${result.conf}%)`);
                allDetails.push(`${result.name}: ${result.pred === 'T' ? 'Tài' : 'Xỉu'} (${result.conf}%)`);
            }
        }

        if (groupCount > 0) {
            const avgGroupTai = groupTai / groupCount;
            const avgGroupXiu = groupXiu / groupCount;
            const groupPred = avgGroupTai >= avgGroupXiu ? 'T' : 'X';
            const groupConf = Math.round(Math.max(avgGroupTai, avgGroupXiu));
            groupResults[group.name] = {
                prediction: groupPred === 'T' ? 'Tài' : 'Xỉu',
                confidence: Math.min(groupConf, 99),
                total: groupCount,
                details: groupDetails
            };
        }
    }

    // Tính kết quả cuối cùng
    if (totalCount === 0) {
        const lastTotal = totals.length > 0 ? totals[totals.length - 1] : 11;
        const defaultPred = lastTotal >= 11 ? 'T' : 'X';
        allDetails.push(`Mặc định: ${defaultPred === 'T' ? 'Tài' : 'Xỉu'} (55%)`);
        return {
            prediction: defaultPred === 'T' ? 'Tài' : 'Xỉu',
            confidence: 55,
            taiPercent: defaultPred === 'T' ? 55 : 45,
            xiuPercent: defaultPred === 'T' ? 45 : 55,
            details: allDetails,
            totalAlgorithms: 1,
            groups: groupResults
        };
    }

    const avgTai = totalTai / totalCount;
    const avgXiu = totalXiu / totalCount;
    const taiPercent = (avgTai / (avgTai + avgXiu)) * 100;
    const xiuPercent = 100 - taiPercent;
    const finalPred = taiPercent >= 50 ? 'T' : 'X';
    const finalConf = Math.round(Math.max(taiPercent, xiuPercent));

    return {
        prediction: finalPred === 'T' ? 'Tài' : 'Xỉu',
        confidence: Math.min(finalConf, 99),
        taiPercent: Math.round(taiPercent),
        xiuPercent: Math.round(xiuPercent),
        details: allDetails,
        totalAlgorithms: totalCount,
        groups: groupResults
    };
}

// ============================================================
// PREDICTOR SERVICE
// ============================================================
class PredictorService {
    constructor() {
        this.history = [];
        this.latestRound = null;
        this.latestPrediction = null;
        this.lastPhien = null;
        this.isProcessing = false;
        this.data_store = {};
        this.dem_sai = 0;
        this.pattern_sai = {};
        this.diem_lich_su = [];
    }

    async fetchAndPredict() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const response = await fetch(CONFIG.API_URL, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'vi-VN,vi;q=0.9'
                }
            });

            if (!response.ok) {
                this.isProcessing = false;
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

            if (round.Phien && round.Phien !== this.lastPhien && round.Xuc_xac_1 > 0) {
                if (round.Tong === 0) {
                    round.Tong = round.Xuc_xac_1 + round.Xuc_xac_2 + round.Xuc_xac_3;
                }

                this.lastPhien = round.Phien;
                
                this.history.push(round);
                if (this.history.length > 100) {
                    this.history = this.history.slice(-100);
                }

                this.latestRound = round;

                const seq = seqFromHistory(this.history);
                const totals = getTotals(this.history);
                const xx_list = [String(round.Xuc_xac_1), String(round.Xuc_xac_2), String(round.Xuc_xac_3)];
                
                // Cập nhật pattern memory
                if (round.Ket_qua) {
                    const actual = round.Ket_qua === 'Tài' ? 'T' : 'X';
                    updatePatternMemory(seq, actual);
                }
                
                this.diem_lich_su.push(round.Tong);
                if (this.diem_lich_su.length > 6) this.diem_lich_su.shift();
                
                const result = predictAll(seq, totals, xx_list, this.diem_lich_su, this.data_store);
                
                this.latestPrediction = {
                    prediction: result.prediction,
                    confidence: result.confidence,
                    details: result.details,
                    taiPercent: result.taiPercent,
                    xiuPercent: result.xiuPercent,
                    totalAlgorithms: result.totalAlgorithms,
                    groups: result.groups,
                    timestamp: nowStr()
                };
            }
        } catch (error) {
            // Silent fail
        }

        this.isProcessing = false;
    }
}

// ============================================================
// EXPRESS ROUTES
// ============================================================
const predictor = new PredictorService();

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'API Predictor - 70 Algorithms - 7 Groups - Siêu VIP',
        time: new Date().toISOString(),
        keepAlive: keepAliveCount
    });
});

app.get('/predict', (req, res) => {
    if (!predictor.latestRound || !predictor.latestPrediction) {
        return res.json({
            status: 'waiting',
            message: 'Chưa có dữ liệu, đang chờ phiên mới...',
            time: new Date().toISOString()
        });
    }

    const result = {
        "Phien": predictor.latestRound.Phien,
        "Xuc_xac1": predictor.latestRound.Xuc_xac_1,
        "Xuc_xac2": predictor.latestRound.Xuc_xac_2,
        "Xuc_xac3": predictor.latestRound.Xuc_xac_3,
        "Tong": predictor.latestRound.Tong,
        "Ketqua": predictor.latestRound.Ket_qua || "Chưa có",
        "Du_doan": predictor.latestPrediction.prediction,
        "cre": CONFIG.CREATOR_ID,
        "meta": {
            "timestamp": predictor.latestPrediction.timestamp,
            "reason": predictor.latestPrediction.details.join(" | "),
            "confidence": predictor.latestPrediction.confidence,
            "tai_percent": predictor.latestPrediction.taiPercent,
            "xiu_percent": predictor.latestPrediction.xiuPercent,
            "total_algorithms": predictor.latestPrediction.totalAlgorithms,
            "groups": predictor.latestPrediction.groups
        }
    };

    res.json(result);
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

// ============================================================
// START
// ============================================================
console.log('🚀 API Predictor - 70 Algorithms - 7 Groups - Siêu VIP');
console.log(`📡 API: ${CONFIG.API_URL}`);
console.log(`⏱️ Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
console.log(`👤 Creator: ${CONFIG.CREATOR_ID}`);
console.log(`📊 Endpoints:`);
console.log(`   /              - Health check`);
console.log(`   /predict       - Dự đoán mới nhất (JSON format)`);
console.log(`   /history       - Lịch sử 30 phiên`);
console.log('─────────────────────────────');
console.log(`📚 PATTERN DB: ${Object.keys(PATTERN_DB).length} patterns`);
console.log(`📚 MANUAL PATTERNS: ${MANUAL_PATTERNS.length} patterns`);
console.log(`🧠 Total algorithms: 70 algorithms`);
console.log(`📋 7 Groups:`);
console.log(`   1. Dạng 1: Thuật toán cầu (10 algorithms)`);
console.log(`   2. Dạng 2: Thuật toán mẫu cầu TXTXT (10 algorithms)`);
console.log(`   3. Dạng 3: Thuật toán tính tổng xúc xắc (10 algorithms)`);
console.log(`   4. Dạng 4: Thuật toán bẻ cầu (10 algorithms)`);
console.log(`   5. Dạng 5: Thuật toán tính bệt (10 algorithms)`);
console.log(`   6. Dạng 6: Thuật toán mẫu cầu cổ điển (10 algorithms)`);
console.log(`   7. Dạng 7: Thuật toán nâng cao (10 algorithms)`);
console.log(`✅ Minimum confidence: ${CONFIG.MIN_CONFIDENCE}%`);

setTimeout(() => predictor.fetchAndPredict(), 1000);
setInterval(() => predictor.fetchAndPredict(), CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
