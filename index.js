// ============================================================
// api_predict_render.js - SIÊU VIP 60+ THUẬT TOÁN
// FULL THUẬT TOÁN 2000+ DÒNG
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
    CREATOR_ID: '@bucactaodi'
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
// THUẬT TOÁN 1-40: CÁC THUẬT TOÁN CƠ BẢN
// ============================================================

// 1. PATTERN DB
function algo_patternDB(seq) {
    let patternStr = seq.join('');
    const maxLen = Math.min(patternStr.length, 20);
    for (let len = maxLen; len >= 1; len--) {
        const subPattern = patternStr.slice(-len);
        if (PATTERN_DB[subPattern]) {
            const result = PATTERN_DB[subPattern];
            return { pred: result.pred, conf: result.conf, name: `Pattern DB - ${subPattern}` };
        }
    }
    return null;
}

// 2. MANUAL PATTERNS
function algo_manualPatterns(totals) {
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
            return { pred: pat.pred, conf: randomInt(80, 100), name: `Manual - ${pat.note}` };
        }
    }
    return null;
}

// 3. Classic Patterns
function algo_classicPatterns(seq, totals) {
    const patternStr = seq.join('');
    if (patternStr.endsWith("TXT")) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic TXT' };
    if (patternStr.endsWith("XTX")) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic XTX' };
    if (patternStr.endsWith("TTX")) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic TTX' };
    if (patternStr.endsWith("XXT")) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic XXT' };
    if (totals && totals.length >= 2) {
        const lastTwo = totals.slice(-2);
        const lastThree = totals.length >= 3 ? totals.slice(-3) : null;
        if (lastTwo[0] === 7 && lastTwo[1] === 6) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 7 6' };
        if (lastTwo[0] === 6 && lastTwo[1] === 7) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 6 7' };
        if (lastTwo[0] === 8 && lastTwo[1] === 7) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 8 7' };
        if (lastTwo[0] === 7 && lastTwo[1] === 8) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 7 8' };
        if (lastTwo[0] === 9 && lastTwo[1] === 4) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 9 4' };
        if (lastTwo[0] === 4 && lastTwo[1] === 9) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 4 9' };
        if (lastTwo[0] === 15 && lastTwo[1] === 6) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 15 6' };
        if (lastTwo[0] === 10 && lastTwo[1] === 8) return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 10 8' };
        if (lastTwo[0] === 11 && lastTwo[1] === 11) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 11 11' };
        if (lastTwo[0] === 18 || lastTwo[1] === 18) return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 18' };
        if (lastThree && lastThree[0] === 7 && lastThree[1] === 6 && lastThree[2] === 13) {
            return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 7 6 13' };
        }
    }
    return null;
}

// 4. Tổng điểm
function algo_totalScore(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    if (last >= 16) return { pred: 'T', conf: randomInt(85, 98), name: `Tổng ${last} ≥16` };
    if (last >= 13) return { pred: 'T', conf: randomInt(75, 90), name: `Tổng ${last} ≥13` };
    if (last >= 11) return { pred: 'T', conf: randomInt(65, 85), name: `Tổng ${last} ≥11` };
    if (last <= 6) return { pred: 'X', conf: randomInt(85, 98), name: `Tổng ${last} ≤6` };
    if (last <= 8) return { pred: 'X', conf: randomInt(75, 90), name: `Tổng ${last} ≤8` };
    if (last <= 10) return { pred: 'X', conf: randomInt(65, 85), name: `Tổng ${last} ≤10` };
    return null;
}

// 5. Xu hướng 5
function algo_trend5(seq) {
    if (seq.length < 5) return null;
    const recent = seq.slice(-5);
    const countT = recent.filter(x => x === 'T').length;
    const countX = recent.filter(x => x === 'X').length;
    if (countT === countX) return null;
    const conf = Math.min(randomInt(60 + Math.abs(countT - countX) * 8, 60 + Math.abs(countT - countX) * 8 + 10), 95);
    return { pred: countT > countX ? 'T' : 'X', conf: conf, name: `Xu hướng ${countT}T/${countX}X` };
}

// 6. Xu hướng 10
function algo_trend10(seq) {
    if (seq.length < 10) return null;
    const recent = seq.slice(-10);
    const countT = recent.filter(x => x === 'T').length;
    const countX = recent.filter(x => x === 'X').length;
    if (Math.abs(countT - countX) < 2) return null;
    const conf = Math.min(randomInt(55 + Math.abs(countT - countX) * 4, 55 + Math.abs(countT - countX) * 4 + 10), 90);
    return { pred: countT > countX ? 'T' : 'X', conf: conf, name: `Xu hướng 10: ${countT}T/${countX}X` };
}

// 7. Bẻ cầu
function algo_runBreak(seq) {
    if (seq.length < 2) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen >= 5) return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: `Bẻ cầu ${runLen} tay` };
    if (runLen >= 4) return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(70, 85), name: `Bẻ cầu ${runLen} tay` };
    return null;
}

// 8. Theo cầu
function algo_runFollow(seq) {
    if (seq.length < 2) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen >= 3 && runLen <= 4) return { pred: last, conf: randomInt(60, 75), name: `Theo cầu ${runLen} tay` };
    if (runLen <= 2) return { pred: last, conf: randomInt(55, 70), name: `Tiếp tục ${last} (${runLen} tay)` };
    return null;
}

// 9. Markov bậc 1
function algo_markov1(seq) {
    if (seq.length < 2) return null;
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

// 10. Markov bậc 2
function algo_markov2(seq) {
    if (seq.length < 3) return null;
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

// 11. Markov bậc 3
function algo_markov3(seq) {
    if (seq.length < 4) return null;
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

// 12. Tần suất
function algo_frequency(seq) {
    if (seq.length < 5) return null;
    const window = Math.min(seq.length, 50);
    const recent = seq.slice(-window);
    let wT = 0, wX = 0;
    for (let i = 0; i < recent.length; i++) {
        const w = Math.pow(0.93, recent.length - 1 - i);
        if (recent[i] === 'T') wT += w;
        else wX += w;
    }
    if (wT + wX === 0) return null;
    const probT = wT / (wT + wX);
    const conf = Math.abs(probT - 0.5) * 2 * 100;
    if (conf < 5) return null;
    return { pred: probT > 0.5 ? 'T' : 'X', conf: Math.min(Math.round(conf + 50), 95), name: 'Tần suất' };
}

// 13. Đa số
function algo_majority(seq) {
    if (seq.length < 10) return null;
    const recent = seq.slice(-15);
    const t = recent.filter(r => r === 'T').length;
    const x = recent.length - t;
    if (Math.abs(t - x) < 3) return null;
    const conf = 55 + Math.abs(t - x) * 2;
    return { pred: t > x ? 'T' : 'X', conf: Math.min(conf, 85), name: 'Đa số' };
}

// 14. Chênh lệch
function algo_cumulative(seq) {
    if (seq.length < 15) return null;
    const recent = seq.slice(-25);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (Math.abs(imbalance) < 3) return null;
    const conf = 55 + Math.min(Math.abs(imbalance) * 2, 30);
    return { pred: imbalance > 0 ? 'T' : 'X', conf: Math.min(conf, 85), name: 'Chênh lệch' };
}

// 15. Chu kỳ
function algo_cycle(seq) {
    if (seq.length < 10) return null;
    for (let cycle = 3; cycle <= Math.min(10, seq.length / 2); cycle++) {
        const lastCycle = seq.slice(-cycle);
        let matches = [];
        for (let i = 0; i <= seq.length - cycle - 1; i++) {
            if (seq.slice(i, i + cycle).join('') === lastCycle.join('')) matches.push(i);
        }
        if (matches.length >= 2) {
            const nextIdx = matches[matches.length - 1] + cycle;
            if (nextIdx < seq.length) {
                const conf = 60 + Math.min(30, matches.length * 3);
                return { pred: seq[nextIdx] === 'T' ? 'T' : 'X', conf: Math.min(conf, 90), name: `Chu kỳ ${cycle}` };
            }
        }
    }
    return null;
}

// 16. Fibonacci
function algo_fibonacci(totals) {
    if (totals.length < 8) return null;
    const recent = totals.slice(-8);
    const diffs = [];
    for (let i = 1; i < recent.length; i++) diffs.push(recent[i] - recent[i - 1]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const nextTotal = Math.min(18, Math.max(3, Math.round(recent[recent.length - 1] + avgDiff)));
    const conf = 55 + Math.min(Math.abs(avgDiff) * 2.5, 30);
    return { pred: nextTotal > 10 ? 'T' : 'X', conf: Math.min(conf, 85), name: 'Fibonacci' };
}

// 17. RSI
function algo_rsi(seq) {
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

// 18. Bollinger
function algo_bollinger(seq) {
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

// 19. MACD
function algo_macd(seq) {
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

// 20. Stochastic
function algo_stochastic(seq) {
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

// 21. Williams %R
function algo_williams(seq) {
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

// 22. CCI
function algo_cci(seq) {
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

// 23. Entropy
function algo_entropy(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const recent = seq.slice(-window);
    const p_t = recent.filter(r => r === 'T').length / window;
    if (p_t === 0 || p_t === 1) return { pred: recent[recent.length - 1], conf: randomInt(65, 80), name: 'Entropy' };
    const entropy = -p_t * Math.log2(p_t) - (1 - p_t) * Math.log2(1 - p_t);
    if (entropy > 0.95) {
        return { pred: recent[recent.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(70, 88), name: 'Entropy' };
    }
    return null;
}

// 24. Linear Regression
function algo_linear(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const y = seq.slice(-window).map(c => c === 'T' ? 1 : 0);
    const x = Array.from({ length: window }, (_, i) => i);
    const n = window;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    const pred = slope * window + intercept;
    const conf = 55 + Math.abs(pred - 0.5) * 40;
    return { pred: pred > 0.5 ? 'T' : 'X', conf: Math.min(Math.round(conf), 85), name: 'Linear' };
}

// 25. KNN
function algo_knn(seq) {
    if (seq.length < 15) return null;
    const k = 5, lookback = 10;
    const query = seq.slice(-lookback);
    const distances = [];
    for (let i = 0; i < seq.length - lookback - 1; i++) {
        const segment = seq.slice(i, i + lookback);
        let distance = 0;
        for (let j = 0; j < lookback; j++) if (segment[j] !== query[j]) distance++;
        distances.push({ distance, next: seq[i + lookback] });
    }
    distances.sort((a, b) => a.distance - b.distance);
    const neighbors = distances.slice(0, k).map(d => d.next);
    const tCount = neighbors.filter(n => n === 'T').length;
    if (Math.abs(tCount - (k - tCount)) < 2) return null;
    const conf = 55 + Math.abs(tCount - (k - tCount)) * 8;
    return { pred: tCount > k - tCount ? 'T' : 'X', conf: Math.min(Math.round(conf), 85), name: 'KNN' };
}

// 26. Naive Bayes
function algo_naiveBayes(seq) {
    if (seq.length < 10) return null;
    const p_t = seq.filter(r => r === 'T').length / seq.length;
    const p_x = 1 - p_t;
    const last5 = seq.slice(-5);
    let cond_t = 0, cond_x = 0;
    let tCount = 0, xCount = 0;
    for (let i = 0; i < seq.length - 5; i++) {
        if (seq.slice(i, i + 5).join('') === last5.join('')) {
            const next = seq[i + 5];
            if (next === 'T') { cond_t++; tCount++; }
            else { cond_x++; xCount++; }
        }
    }
    if (tCount + xCount < 2) return null;
    cond_t = cond_t / Math.max(1, tCount);
    cond_x = cond_x / Math.max(1, xCount);
    const post_t = p_t * cond_t;
    const post_x = p_x * cond_x;
    if (Math.abs(post_t - post_x) < 0.05) return null;
    const conf = 55 + Math.abs(post_t - post_x) * 50;
    return { pred: post_t > post_x ? 'T' : 'X', conf: Math.min(Math.round(conf), 85), name: 'Naive Bayes' };
}

// 27. Decision Tree
function algo_decisionTree(seq) {
    if (seq.length < 10) return null;
    const last1 = seq[seq.length - 1];
    const last2 = seq.length > 1 ? seq[seq.length - 2] : null;
    const last3 = seq.length > 2 ? seq[seq.length - 3] : null;
    const t5 = seq.slice(-5).filter(c => c === 'T').length;
    if (last1 === 'T' && last2 === 'T' && last3 === 'T') return { pred: 'X', conf: randomInt(75, 90), name: 'Decision Tree' };
    if (last1 === 'X' && last2 === 'X' && last3 === 'X') return { pred: 'T', conf: randomInt(75, 90), name: 'Decision Tree' };
    if (last1 === 'T' && last2 === 'X' && last3 === 'T') return { pred: 'X', conf: randomInt(70, 85), name: 'Decision Tree' };
    if (last1 === 'X' && last2 === 'T' && last3 === 'X') return { pred: 'T', conf: randomInt(70, 85), name: 'Decision Tree' };
    if (t5 >= 4) return { pred: 'X', conf: randomInt(70, 85), name: 'Decision Tree' };
    if (t5 <= 1) return { pred: 'T', conf: randomInt(70, 85), name: 'Decision Tree' };
    return null;
}

// 28. Mean Reversion
function algo_meanReversion(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const recent = seq.slice(-window);
    const mean = recent.filter(r => r === 'T').length / window;
    if (mean > 0.7) return { pred: 'X', conf: randomInt(70, 88), name: 'Mean Reversion' };
    if (mean < 0.3) return { pred: 'T', conf: randomInt(70, 88), name: 'Mean Reversion' };
    return null;
}

// 29. Pattern Matching
function algo_patternMatching(seq) {
    if (seq.length < 20) return null;
    const lookback = 15;
    const query = seq.slice(-lookback);
    let bestMatch = -1, bestScore = -1;
    for (let i = 0; i < seq.length - lookback; i++) {
        const segment = seq.slice(i, i + lookback);
        let score = 0;
        for (let j = 0; j < lookback; j++) if (segment[j] === query[j]) score++;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = i;
        }
    }
    if (bestMatch !== -1 && bestMatch + lookback < seq.length && bestScore > lookback * 0.7) {
        const conf = 55 + (bestScore / lookback) * 30;
        return { pred: seq[bestMatch + lookback] === 'T' ? 'T' : 'X', conf: Math.min(Math.round(conf), 85), name: 'Pattern Matching' };
    }
    return null;
}

// 30. Zigzag
function algo_zigzag(seq) {
    if (seq.length < 5) return null;
    let changes = 0;
    for (let i = 1; i < Math.min(5, seq.length); i++) {
        if (seq[seq.length - i] !== seq[seq.length - i - 1]) changes++;
    }
    if (changes >= 4) return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 92), name: 'Zigzag' };
    if (changes >= 3) return { pred: seq[seq.length - 1], conf: randomInt(65, 80), name: 'Zigzag' };
    return null;
}

// 31. Cân bằng 2-2
function algo_balance(seq) {
    if (seq.length < 4) return null;
    const last4 = seq.slice(-4);
    const countT = last4.filter(x => x === 'T').length;
    const countX = last4.filter(x => x === 'X').length;
    if (countT === 2 && countX === 2) {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 92), name: 'Cân bằng 2-2' };
    }
    return null;
}

// 32. Bệt kép
function algo_doubleRun(seq) {
    if (seq.length < 8) return null;
    const last8 = seq.slice(-8);
    if (last8.slice(0, 4).join('') === last8.slice(4).join('')) {
        const pred = last8[0] === 'T' ? 'X' : 'T';
        return { pred: pred, conf: randomInt(78, 93), name: 'Bệt kép' };
    }
    return null;
}

// 33. Cầu 1-1
function algo_zigzagPattern(seq) {
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
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: 'Cầu 1-1' };
    }
    return null;
}

// 34. Pattern Detect - Cầu 1-1
function algo_detect_1_1(seq) {
    if (seq.length >= 4 && seq.slice(-4).join('') === "TXTX") return { pred: 'X', conf: randomInt(85, 95), name: 'Cầu 1-1 TXTX' };
    if (seq.length >= 4 && seq.slice(-4).join('') === "XTXT") return { pred: 'T', conf: randomInt(85, 95), name: 'Cầu 1-1 XTXT' };
    return null;
}

// 35. Pattern Detect - Cầu 2-2
function algo_detect_2_2(seq) {
    if (seq.length >= 4 && seq.slice(-4).join('') === "TTXX") return { pred: 'X', conf: randomInt(80, 92), name: 'Cầu 2-2 TTXX' };
    if (seq.length >= 4 && seq.slice(-4).join('') === "XXTT") return { pred: 'T', conf: randomInt(80, 92), name: 'Cầu 2-2 XXTT' };
    return null;
}

// 36. Pattern Detect - Cầu 3-3
function algo_detect_3_3(seq) {
    if (seq.length >= 6 && seq.slice(-6).join('') === "TTTXXX") return { pred: 'X', conf: randomInt(75, 90), name: 'Cầu 3-3 TTTXXX' };
    if (seq.length >= 6 && seq.slice(-6).join('') === "XXXTTT") return { pred: 'T', conf: randomInt(75, 90), name: 'Cầu 3-3 XXXTTT' };
    return null;
}

// 37. Pattern Detect - Cầu 1-2-3
function algo_detect_1_2_3(seq) {
    if (seq.length >= 6 && seq.slice(-6).join('') === "TXXTTT") return { pred: 'X', conf: randomInt(75, 90), name: 'Cầu 1-2-3 TXXTTT' };
    if (seq.length >= 6 && seq.slice(-6).join('') === "XTTXXX") return { pred: 'T', conf: randomInt(75, 90), name: 'Cầu 1-2-3 XTTXXX' };
    return null;
}

// 38. Pattern Detect - Tam giác
function algo_detect_triangle(seq) {
    if (seq.length >= 5 && seq.slice(-5).join('') === "TXTXT") return { pred: 'X', conf: randomInt(78, 92), name: 'Cầu tam giác TXTXT' };
    if (seq.length >= 5 && seq.slice(-5).join('') === "XTXTX") return { pred: 'T', conf: randomInt(78, 92), name: 'Cầu tam giác XTXTX' };
    return null;
}

// 39. Pattern Detect - Rồng
function algo_detect_dragon(seq) {
    let tRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'T') tRun++;
        else break;
    }
    if (tRun >= 6) return { pred: 'X', conf: randomInt(80, 92), name: `Cầu Rồng ${tRun}` };
    if (tRun >= 4) return { pred: 'T', conf: randomInt(70, 85), name: `Cầu Rồng ${tRun}` };
    return null;
}

// 40. Pattern Detect - Hổ
function algo_detect_tiger(seq) {
    let xRun = 0;
    for (let i = seq.length - 1; i >= 0; i--) {
        if (seq[i] === 'X') xRun++;
        else break;
    }
    if (xRun >= 6) return { pred: 'T', conf: randomInt(80, 92), name: `Cầu Hổ ${xRun}` };
    if (xRun >= 4) return { pred: 'X', conf: randomInt(70, 85), name: `Cầu Hổ ${xRun}` };
    return null;
}

// ============================================================
// THUẬT TOÁN 41-60: THUẬT TOÁN NÂNG CAO
// ============================================================

// 41. Fibonacci Fractal
function algo_fibonacciFractal(seq) {
    if (seq.length < 10) return null;
    const fibs = [1, 1, 2, 3, 5, 8, 13];
    let countMatch = 0;
    for (let f of fibs) {
        if (seq.length > f && seq[seq.length - f] === seq[seq.length - 1]) countMatch++;
    }
    if (countMatch >= Math.floor(fibs.length / 2)) {
        return { pred: seq[seq.length - 1], conf: randomInt(65, 85), name: 'Fibonacci Fractal' };
    }
    const pred = seq[seq.length - 1] === 'T' ? 'X' : 'T';
    return { pred: pred, conf: randomInt(60, 80), name: 'Fibonacci Fractal' };
}

// 42. Moving Average Cross
function algo_movingAverageCross(seq) {
    if (seq.length < 13) return null;
    const short = 5, long = 13;
    const shortT = seq.slice(-short).filter(r => r === 'T').length / short;
    const longT = seq.slice(-long).filter(r => r === 'T').length / long;
    if (shortT > longT + 0.12) return { pred: 'T', conf: randomInt(70, 88), name: 'MA Cross' };
    if (longT > shortT + 0.12) return { pred: 'X', conf: randomInt(70, 88), name: 'MA Cross' };
    return null;
}

// 43. Break Signals
function algo_breakSignals(seq) {
    if (seq.length < 10) return null;
    let breakCount = 0;
    let details = [];
    const rsiResult = algo_rsi(seq);
    if (rsiResult && rsiResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('RSI'); }
    const bollingerResult = algo_bollinger(seq);
    if (bollingerResult && bollingerResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('Bollinger'); }
    const macdResult = algo_macd(seq);
    if (macdResult && macdResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('MACD'); }
    const stochResult = algo_stochastic(seq);
    if (stochResult && stochResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('Stochastic'); }
    const willResult = algo_williams(seq);
    if (willResult && willResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('Williams'); }
    const cciResult = algo_cci(seq);
    if (cciResult && cciResult.pred !== seq[seq.length - 1]) { breakCount++; details.push('CCI'); }
    if (breakCount >= 3) {
        const pred = seq[seq.length - 1] === 'T' ? 'X' : 'T';
        const conf = Math.min(70 + breakCount * 5, 95);
        return { pred: pred, conf: conf, name: `Break Signals (${breakCount})` };
    }
    return null;
}

// 44. Pattern Memory
let PATTERN_MEMORY = {};
function algo_patternMemory(seq) {
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
        return { pred: bestMatch === 'T' ? 'T' : 'X', conf: Math.round(conf), name: 'Pattern Memory' };
    }
    return null;
}

// 45. Error Memory
let ERROR_MEMORY = {};
function algo_errorMemory(seq) {
    if (seq.length < 3) return null;
    const last3 = seq.slice(-3).join(',');
    if (ERROR_MEMORY[last3] && ERROR_MEMORY[last3] >= 2) {
        const pred = seq[seq.length - 1] === 'T' ? 'X' : 'T';
        return { pred: pred, conf: randomInt(80, 92), name: 'Error Memory' };
    }
    return null;
}

// 46. 3 Xúc Xắc Giống Nhau
function algo_threeDice(xx_list) {
    if (!xx_list || xx_list.length !== 3) return null;
    if (xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
        const so = xx_list[0];
        if (['1', '2', '4'].includes(so)) return { pred: 'X', conf: randomInt(90, 98), name: `3 xúc xắc ${so} → Xỉu` };
        if (['3', '5'].includes(so)) return { pred: 'T', conf: randomInt(90, 98), name: `3 xúc xắc ${so} → Tài` };
        if (so === '6') return { pred: 'T', conf: randomInt(85, 95), name: `3 xúc xắc ${so} → Tài` };
    }
    return null;
}

// 47. Tổng Điểm Lịch Sử
function algo_historyTotal(diem_lich_su) {
    if (!diem_lich_su || diem_lich_su.length < 3) return null;
    const avg = diem_lich_su.reduce((a, b) => a + b, 0) / diem_lich_su.length;
    if (avg >= 11) return { pred: 'T', conf: randomInt(65, 80), name: `TB điểm ${avg.toFixed(1)} ≥ 11` };
    else return { pred: 'X', conf: randomInt(65, 80), name: `TB điểm ${avg.toFixed(1)} < 11` };
}

// 48. Bệt Tài + Xí Ngầu 3
function algo_breakTai3(seq, xx_list, data_store) {
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

// 49. Bệt Xỉu + Xí Ngầu 5
function algo_breakXiu5(seq, xx_list, data_store) {
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

// 50. Cầu Bệt-Bệt
function algo_doubleBet(seq) {
    if (seq.length < 9) return null;
    const pattern = seq.join('');
    for (let i = 4; i <= 6; i++) {
        if (pattern.length >= i * 2) {
            const sub1 = pattern.slice(-i * 2, -i);
            const sub2 = pattern.slice(-i);
            if (sub1 === 'T'.repeat(i) && sub2 === 'X'.repeat(i)) {
                return { pred: 'X', conf: randomInt(85, 95), name: `Bệt-bệt ${sub1 + sub2}` };
            }
            if (sub1 === 'X'.repeat(i) && sub2 === 'T'.repeat(i)) {
                return { pred: 'T', conf: randomInt(85, 95), name: `Bệt-bệt ${sub1 + sub2}` };
            }
        }
    }
    return null;
}

// 51. Cầu 4-4
function algo_detect_4_4(seq) {
    if (seq.length >= 8 && seq.slice(-8).join('') === "TTTTXXXX") {
        return { pred: 'X', conf: randomInt(75, 88), name: 'Cầu 4-4 TTTTXXXX' };
    }
    if (seq.length >= 8 && seq.slice(-8).join('') === "XXXXTTTT") {
        return { pred: 'T', conf: randomInt(75, 88), name: 'Cầu 4-4 XXXXTTTT' };
    }
    return null;
}

// 52. Cầu 5-5
function algo_detect_5_5(seq) {
    if (seq.length >= 10 && seq.slice(-10).join('') === "TTTTTXXXXX") {
        return { pred: 'X', conf: randomInt(73, 86), name: 'Cầu 5-5 TTTTTXXXXX' };
    }
    if (seq.length >= 10 && seq.slice(-10).join('') === "XXXXXTTTTT") {
        return { pred: 'T', conf: randomInt(73, 86), name: 'Cầu 5-5 XXXXXTTTTT' };
    }
    return null;
}

// 53. Cầu 3-2-1
function algo_detect_3_2_1(seq) {
    if (seq.length >= 6 && seq.slice(-6).join('') === "TTTXXT") {
        return { pred: 'X', conf: randomInt(72, 88), name: 'Cầu 3-2-1 TTTXXT' };
    }
    if (seq.length >= 6 && seq.slice(-6).join('') === "XXXTTX") {
        return { pred: 'T', conf: randomInt(72, 88), name: 'Cầu 3-2-1 XXXTTX' };
    }
    return null;
}

// 54. Cầu 2-1-1-2
function algo_detect_2_1_1_2(seq) {
    if (seq.length >= 6 && seq.slice(-6).join('') === "TTXTXX") {
        return { pred: 'X', conf: randomInt(74, 90), name: 'Cầu 2-1-1-2 TTXTXX' };
    }
    if (seq.length >= 6 && seq.slice(-6).join('') === "XXTXTT") {
        return { pred: 'T', conf: randomInt(74, 90), name: 'Cầu 2-1-1-2 XXTXTT' };
    }
    return null;
}

// 55. Cầu 2-1-2
function algo_detect_2_1_2(seq) {
    if (seq.length >= 5 && seq.slice(-5).join('') === "TTXTT") {
        return { pred: 'X', conf: randomInt(78, 92), name: 'Cầu 2-1-2 TTXTT' };
    }
    if (seq.length >= 5 && seq.slice(-5).join('') === "XXTXX") {
        return { pred: 'T', conf: randomInt(78, 92), name: 'Cầu 2-1-2 XXTXX' };
    }
    return null;
}

// 56. Cầu 3-1-3
function algo_detect_3_1_3(seq) {
    if (seq.length >= 7 && seq.slice(-7).join('') === "TTTXTTT") {
        return { pred: 'X', conf: randomInt(76, 90), name: 'Cầu 3-1-3 TTTXTTT' };
    }
    if (seq.length >= 7 && seq.slice(-7).join('') === "XXXTXXX") {
        return { pred: 'T', conf: randomInt(76, 90), name: 'Cầu 3-1-3 XXXTXXX' };
    }
    return null;
}

// 57. Cầu 1-2
function algo_detect_1_2(seq) {
    if (seq.length >= 3 && seq.slice(-3).join('') === "TXX") {
        return { pred: 'X', conf: randomInt(70, 85), name: 'Cầu 1-2 TXX' };
    }
    if (seq.length >= 3 && seq.slice(-3).join('') === "XTT") {
        return { pred: 'T', conf: randomInt(70, 85), name: 'Cầu 1-2 XTT' };
    }
    return null;
}

// 58. Cầu 2-1
function algo_detect_2_1(seq) {
    if (seq.length >= 3 && seq.slice(-3).join('') === "TTX") {
        return { pred: 'X', conf: randomInt(72, 87), name: 'Cầu 2-1 TTX' };
    }
    if (seq.length >= 3 && seq.slice(-3).join('') === "XXT") {
        return { pred: 'T', conf: randomInt(72, 87), name: 'Cầu 2-1 XXT' };
    }
    return null;
}

// 59. Cầu 1-3-2
function algo_detect_1_3_2(seq) {
    if (seq.length >= 6 && seq.slice(-6).join('') === "TXXXTT") {
        return { pred: 'X', conf: randomInt(73, 88), name: 'Cầu 1-3-2 TXXXTT' };
    }
    if (seq.length >= 6 && seq.slice(-6).join('') === "XTTTXX") {
        return { pred: 'T', conf: randomInt(73, 88), name: 'Cầu 1-3-2 XTTTXX' };
    }
    return null;
}

// 60. Cầu 1-2-4
function algo_detect_1_2_4(seq) {
    if (seq.length >= 7 && seq.slice(-7).join('') === "TXXTTTT") {
        return { pred: 'X', conf: randomInt(72, 87), name: 'Cầu 1-2-4 TXXTTTT' };
    }
    if (seq.length >= 7 && seq.slice(-7).join('') === "XTTXXXX") {
        return { pred: 'T', conf: randomInt(72, 87), name: 'Cầu 1-2-4 XTTXXXX' };
    }
    return null;
}

// ============================================================
// DANH SÁCH TẤT CẢ 60 THUẬT TOÁN
// ============================================================
const ALGORITHMS = [
    algo_patternDB,
    algo_manualPatterns,
    algo_classicPatterns,
    algo_totalScore,
    algo_trend5,
    algo_trend10,
    algo_runBreak,
    algo_runFollow,
    algo_markov1,
    algo_markov2,
    algo_markov3,
    algo_frequency,
    algo_majority,
    algo_cumulative,
    algo_cycle,
    algo_fibonacci,
    algo_rsi,
    algo_bollinger,
    algo_macd,
    algo_stochastic,
    algo_williams,
    algo_cci,
    algo_entropy,
    algo_linear,
    algo_knn,
    algo_naiveBayes,
    algo_decisionTree,
    algo_meanReversion,
    algo_patternMatching,
    algo_zigzag,
    algo_balance,
    algo_doubleRun,
    algo_zigzagPattern,
    algo_detect_1_1,
    algo_detect_2_2,
    algo_detect_3_3,
    algo_detect_1_2_3,
    algo_detect_triangle,
    algo_detect_dragon,
    algo_detect_tiger,
    algo_fibonacciFractal,
    algo_movingAverageCross,
    algo_breakSignals,
    algo_patternMemory,
    algo_errorMemory,
    algo_threeDice,
    algo_historyTotal,
    algo_breakTai3,
    algo_breakXiu5,
    algo_doubleBet,
    algo_detect_4_4,
    algo_detect_5_5,
    algo_detect_3_2_1,
    algo_detect_2_1_1_2,
    algo_detect_2_1_2,
    algo_detect_3_1_3,
    algo_detect_1_2,
    algo_detect_2_1,
    algo_detect_1_3_2,
    algo_detect_1_2_4
];

// ============================================================
// HÀM TỔNG HỢP TẤT CẢ THUẬT TOÁN
// ============================================================
function predictAll(seq, totals, xx_list, diem_lich_su, data_store) {
    const results = [];
    const details = [];
    let totalTai = 0;
    let totalXiu = 0;
    let countTai = 0;
    let countXiu = 0;

    for (const algo of ALGORITHMS) {
        let result = null;
        const name = algo.name;
        
        if (name === 'algo_manualPatterns' || name === 'algo_totalScore' || name === 'algo_fibonacci') {
            result = algo(totals);
        } else if (name === 'algo_classicPatterns') {
            result = algo(seq, totals);
        } else if (name === 'algo_threeDice') {
            result = algo(xx_list);
        } else if (name === 'algo_historyTotal') {
            result = algo(diem_lich_su);
        } else if (name === 'algo_breakTai3' || name === 'algo_breakXiu5') {
            result = algo(seq, xx_list, data_store);
        } else {
            result = algo(seq);
        }
        
        if (result) {
            results.push(result);
            if (result.pred === 'T') {
                totalTai += result.conf;
                countTai++;
            } else {
                totalXiu += result.conf;
                countXiu++;
            }
            details.push(`${result.name}: ${result.pred === 'T' ? 'Tài' : 'Xỉu'} (${result.conf}%)`);
        }
    }

    if (results.length === 0) {
        const lastTotal = totals.length > 0 ? totals[totals.length - 1] : 11;
        const defaultPred = lastTotal >= 11 ? 'T' : 'X';
        details.push(`Mặc định: ${defaultPred === 'T' ? 'Tài' : 'Xỉu'} (55%)`);
        return {
            prediction: defaultPred === 'T' ? 'Tài' : 'Xỉu',
            confidence: 55,
            taiPercent: defaultPred === 'T' ? 55 : 45,
            xiuPercent: defaultPred === 'T' ? 45 : 55,
            details: details,
            totalAlgorithms: 1
        };
    }

    const avgTai = countTai > 0 ? totalTai / countTai : 0;
    const avgXiu = countXiu > 0 ? totalXiu / countXiu : 0;
    const taiPercent = (avgTai / (avgTai + avgXiu)) * 100;
    const xiuPercent = 100 - taiPercent;
    const finalPred = taiPercent >= 50 ? 'T' : 'X';
    const finalConf = Math.round(Math.max(taiPercent, xiuPercent));

    return {
        prediction: finalPred === 'T' ? 'Tài' : 'Xỉu',
        confidence: Math.min(finalConf, 99),
        taiPercent: Math.round(taiPercent),
        xiuPercent: Math.round(xiuPercent),
        details: details,
        totalAlgorithms: results.length
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
        message: 'API Predictor - 60+ Algorithms - Siêu VIP',
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
            "total_algorithms": predictor.latestPrediction.totalAlgorithms
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
console.log('🚀 API Predictor - 60+ Algorithms - Siêu VIP');
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
console.log(`🧠 Total algorithms: ${ALGORITHMS.length} algorithms`);

setTimeout(() => predictor.fetchAndPredict(), 1000);
setInterval(() => predictor.fetchAndPredict(), CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
