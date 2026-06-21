// ============================================================
// api_predict_render.js - 35 THUẬT TOÁN DỰ ĐOÁN TÀI/XỈU
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
    MARKOV_ORDER: 3,
    RUN_WINDOW_SHORT: 6,
    RUN_WINDOW_LONG: 20,
    BASE_CONFIDENCE: 0.5,
    MODELS: ['markov', 'run_length', 'momentum', 'pattern']
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
// THUẬT TOÁN 1: PATTERN DB - 200+ MẪU CẦU
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

// ============================================================
// THUẬT TOÁN 3: CLASSIC PATTERNS
// ============================================================
function algo_classicPatterns(seq, totals) {
    const patternStr = seq.join('');
    
    if (patternStr.endsWith("TXT")) {
        return { pred: 'X', conf: randomInt(80, 100), name: 'Classic TXT' };
    }
    if (patternStr.endsWith("XTX")) {
        return { pred: 'T', conf: randomInt(80, 100), name: 'Classic XTX' };
    }
    if (patternStr.endsWith("TTX")) {
        return { pred: 'X', conf: randomInt(80, 100), name: 'Classic TTX' };
    }
    if (patternStr.endsWith("XXT")) {
        return { pred: 'T', conf: randomInt(80, 100), name: 'Classic XXT' };
    }
    if (patternStr.endsWith("TXXT")) {
        return { pred: 'T', conf: randomInt(80, 100), name: 'Classic TXXT' };
    }
    if (patternStr.endsWith("XTTX")) {
        return { pred: 'X', conf: randomInt(80, 100), name: 'Classic XTTX' };
    }
    
    if (totals && totals.length >= 2) {
        const lastTwo = totals.slice(-2);
        const lastThree = totals.length >= 3 ? totals.slice(-3) : null;
        
        if (lastTwo[0] === 7 && lastTwo[1] === 6) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 7 6 → Tài' };
        }
        if (lastTwo[0] === 6 && lastTwo[1] === 7) {
            return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 6 7 → Xỉu' };
        }
        if (lastTwo[0] === 8 && lastTwo[1] === 7) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 8 7 → Tài' };
        }
        if (lastTwo[0] === 7 && lastTwo[1] === 8) {
            return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 7 8 → Xỉu' };
        }
        if (lastTwo[0] === 9 && lastTwo[1] === 4) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 9 4 → Tài' };
        }
        if (lastTwo[0] === 4 && lastTwo[1] === 9) {
            return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 4 9 → Xỉu' };
        }
        if (lastTwo[0] === 15 && lastTwo[1] === 6) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 15 6 → Tài' };
        }
        if (lastTwo[0] === 10 && lastTwo[1] === 8) {
            return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 10 8 → Xỉu' };
        }
        if (lastTwo[0] === 6 && lastTwo[1] === 9) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 6 9 → Tài' };
        }
        if (lastTwo[0] === 11 && lastTwo[1] === 11) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 11 11 → Tài' };
        }
        if (lastTwo[0] === 18 || lastTwo[1] === 18) {
            return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 18 → Tài' };
        }
        
        if (lastThree) {
            if (lastThree[0] === 7 && lastThree[1] === 6 && lastThree[2] === 13) {
                return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 7 6 13 → Xỉu' };
            }
            if (lastThree[0] === 9 && lastThree[1] === 10 && lastThree[2] === 8) {
                return { pred: 'X', conf: randomInt(80, 100), name: 'Classic 9 10 8 → Xỉu' };
            }
            if (lastThree[0] === 13 && lastThree[1] === 13 && lastThree[2] === 14) {
                return { pred: 'T', conf: randomInt(80, 100), name: 'Classic 13 13 14 → Tài' };
            }
        }
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 4: TỔNG ĐIỂM
// ============================================================
function algo_totalScore(totals) {
    if (totals.length < 1) return null;
    const last = totals[totals.length - 1];
    
    if (last >= 16) {
        return { pred: 'T', conf: randomInt(85, 98), name: `Tổng ${last} ≥16` };
    }
    if (last >= 13) {
        return { pred: 'T', conf: randomInt(75, 90), name: `Tổng ${last} ≥13` };
    }
    if (last >= 11) {
        return { pred: 'T', conf: randomInt(65, 85), name: `Tổng ${last} ≥11` };
    }
    if (last <= 6) {
        return { pred: 'X', conf: randomInt(85, 98), name: `Tổng ${last} ≤6` };
    }
    if (last <= 8) {
        return { pred: 'X', conf: randomInt(75, 90), name: `Tổng ${last} ≤8` };
    }
    if (last <= 10) {
        return { pred: 'X', conf: randomInt(65, 85), name: `Tổng ${last} ≤10` };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 5: XU HƯỚNG 5 PHIÊN
// ============================================================
function algo_trend5(seq) {
    if (seq.length < 5) return null;
    const recent = seq.slice(-5);
    const countT = recent.filter(x => x === 'T').length;
    const countX = recent.filter(x => x === 'X').length;
    if (countT === countX) return null;
    const diff = Math.abs(countT - countX);
    const conf = Math.min(randomInt(60 + diff * 8, 60 + diff * 8 + 10), 95);
    return { pred: countT > countX ? 'T' : 'X', conf: conf, name: `Xu hướng ${countT}T/${countX}X` };
}

// ============================================================
// THUẬT TOÁN 6: XU HƯỚNG 10 PHIÊN
// ============================================================
function algo_trend10(seq) {
    if (seq.length < 10) return null;
    const recent = seq.slice(-10);
    const countT = recent.filter(x => x === 'T').length;
    const countX = recent.filter(x => x === 'X').length;
    if (Math.abs(countT - countX) < 2) return null;
    const conf = Math.min(randomInt(55 + Math.abs(countT - countX) * 4, 55 + Math.abs(countT - countX) * 4 + 10), 90);
    return { pred: countT > countX ? 'T' : 'X', conf: conf, name: `Xu hướng 10: ${countT}T/${countX}X` };
}

// ============================================================
// THUẬT TOÁN 7: CHUỖI - BẺ CẦU
// ============================================================
function algo_runBreak(seq) {
    if (seq.length < 2) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen >= 5) {
        return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(80, 95), name: `Bẻ cầu ${runLen} tay` };
    }
    if (runLen >= 4) {
        return { pred: last === 'T' ? 'X' : 'T', conf: randomInt(70, 85), name: `Bẻ cầu ${runLen} tay` };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 8: CHUỖI - THEO CẦU
// ============================================================
function algo_runFollow(seq) {
    if (seq.length < 2) return null;
    let runLen = 1;
    const last = seq[seq.length - 1];
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === last) runLen++;
        else break;
    }
    if (runLen >= 3 && runLen <= 4) {
        return { pred: last, conf: randomInt(60, 75), name: `Theo cầu ${runLen} tay` };
    }
    if (runLen <= 2) {
        return { pred: last, conf: randomInt(55, 70), name: `Tiếp tục ${last} (${runLen} tay)` };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 9: MARKOV BẬC 1
// ============================================================
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

// ============================================================
// THUẬT TOÁN 10: MARKOV BẬC 2
// ============================================================
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

// ============================================================
// THUẬT TOÁN 11: MARKOV BẬC 3
// ============================================================
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

// ============================================================
// THUẬT TOÁN 12: TẦN SUẤT CÓ TRỌNG SỐ
// ============================================================
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

// ============================================================
// THUẬT TOÁN 13: ĐA SỐ ĐƠN GIẢN
// ============================================================
function algo_majority(seq) {
    if (seq.length < 10) return null;
    const recent = seq.slice(-15);
    const t = recent.filter(r => r === 'T').length;
    const x = recent.length - t;
    if (Math.abs(t - x) < 3) return null;
    const conf = 55 + Math.abs(t - x) * 2;
    return { pred: t > x ? 'T' : 'X', conf: Math.min(conf, 85), name: 'Đa số' };
}

// ============================================================
// THUẬT TOÁN 14: CHÊNH LỆCH TÍCH LŨY
// ============================================================
function algo_cumulative(seq) {
    if (seq.length < 15) return null;
    const recent = seq.slice(-25);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (Math.abs(imbalance) < 3) return null;
    const conf = 55 + Math.min(Math.abs(imbalance) * 2, 30);
    return { pred: imbalance > 0 ? 'T' : 'X', conf: Math.min(conf, 85), name: 'Chênh lệch' };
}

// ============================================================
// THUẬT TOÁN 15: CHU KỲ
// ============================================================
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

// ============================================================
// THUẬT TOÁN 16: FIBONACCI
// ============================================================
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

// ============================================================
// THUẬT TOÁN 17: RSI
// ============================================================
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

// ============================================================
// THUẬT TOÁN 18: BOLLINGER BANDS
// ============================================================
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

// ============================================================
// THUẬT TOÁN 19: MACD
// ============================================================
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

// ============================================================
// THUẬT TOÁN 20: STOCHASTIC
// ============================================================
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

// ============================================================
// THUẬT TOÁN 21: WILLIAMS %R
// ============================================================
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

// ============================================================
// THUẬT TOÁN 22: CCI
// ============================================================
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

// ============================================================
// THUẬT TOÁN 23: ENTROPY
// ============================================================
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

// ============================================================
// THUẬT TOÁN 24: LINEAR REGRESSION
// ============================================================
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

// ============================================================
// THUẬT TOÁN 25: KNN
// ============================================================
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

// ============================================================
// THUẬT TOÁN 26: NAIVE BAYES
// ============================================================
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

// ============================================================
// THUẬT TOÁN 27: DECISION TREE
// ============================================================
function algo_decisionTree(seq) {
    if (seq.length < 10) return null;
    const last1 = seq[seq.length - 1];
    const last2 = seq.length > 1 ? seq[seq.length - 2] : null;
    const last3 = seq.length > 2 ? seq[seq.length - 3] : null;
    const t5 = seq.slice(-5).filter(c => c === 'T').length;
    if (last1 === 'T' && last2 === 'T' && last3 === 'T') {
        return { pred: 'X', conf: randomInt(75, 90), name: 'Decision Tree' };
    }
    if (last1 === 'X' && last2 === 'X' && last3 === 'X') {
        return { pred: 'T', conf: randomInt(75, 90), name: 'Decision Tree' };
    }
    if (last1 === 'T' && last2 === 'X' && last3 === 'T') {
        return { pred: 'X', conf: randomInt(70, 85), name: 'Decision Tree' };
    }
    if (last1 === 'X' && last2 === 'T' && last3 === 'X') {
        return { pred: 'T', conf: randomInt(70, 85), name: 'Decision Tree' };
    }
    if (t5 >= 4) return { pred: 'X', conf: randomInt(70, 85), name: 'Decision Tree' };
    if (t5 <= 1) return { pred: 'T', conf: randomInt(70, 85), name: 'Decision Tree' };
    return null;
}

// ============================================================
// THUẬT TOÁN 28: MEAN REVERSION
// ============================================================
function algo_meanReversion(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const recent = seq.slice(-window);
    const mean = recent.filter(r => r === 'T').length / window;
    if (mean > 0.7) return { pred: 'X', conf: randomInt(70, 88), name: 'Mean Reversion' };
    if (mean < 0.3) return { pred: 'T', conf: randomInt(70, 88), name: 'Mean Reversion' };
    return null;
}

// ============================================================
// THUẬT TOÁN 29: PATTERN MATCHING
// ============================================================
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

// ============================================================
// THUẬT TOÁN 30: ZIGZAG
// ============================================================
function algo_zigzag(seq) {
    if (seq.length < 5) return null;
    let changes = 0;
    for (let i = 1; i < Math.min(5, seq.length); i++) {
        if (seq[seq.length - i] !== seq[seq.length - i - 1]) changes++;
    }
    if (changes >= 4) {
        return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 92), name: 'Zigzag' };
    }
    if (changes >= 3) {
        return { pred: seq[seq.length - 1], conf: randomInt(65, 80), name: 'Zigzag' };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 31: CÂN BẰNG 2-2
// ============================================================
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

// ============================================================
// THUẬT TOÁN 32: BỆT KÉP
// ============================================================
function algo_doubleRun(seq) {
    if (seq.length < 8) return null;
    const last8 = seq.slice(-8);
    if (last8.slice(0, 4).join('') === last8.slice(4).join('')) {
        const pred = last8[0] === 'T' ? 'X' : 'T';
        return { pred: pred, conf: randomInt(78, 93), name: 'Bệt kép' };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 33: CẦU 1-1
// ============================================================
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

// ============================================================
// THUẬT TOÁN 34: PATTERN DETECTORS - CẦU 1-1
// ============================================================
function algo_detect_1_1(seq) {
    if (seq.length >= 4 && seq.slice(-4).join('') === "TXTX") {
        return { pred: 'X', conf: randomInt(85, 95), name: 'Cầu 1-1 TXTX' };
    }
    if (seq.length >= 4 && seq.slice(-4).join('') === "XTXT") {
        return { pred: 'T', conf: randomInt(85, 95), name: 'Cầu 1-1 XTXT' };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 35: PATTERN DETECTORS - CẦU 2-2
// ============================================================
function algo_detect_2_2(seq) {
    if (seq.length >= 4 && seq.slice(-4).join('') === "TTXX") {
        return { pred: 'X', conf: randomInt(80, 92), name: 'Cầu 2-2 TTXX' };
    }
    if (seq.length >= 4 && seq.slice(-4).join('') === "XXTT") {
        return { pred: 'T', conf: randomInt(80, 92), name: 'Cầu 2-2 XXTT' };
    }
    return null;
}

// ============================================================
// DANH SÁCH TẤT CẢ 35 THUẬT TOÁN
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
    algo_detect_2_2
];

// ============================================================
// HÀM TỔNG HỢP TẤT CẢ THUẬT TOÁN
// ============================================================
function predictAll(seq, totals) {
    const results = [];
    const details = [];
    let totalTai = 0;
    let totalXiu = 0;
    let countTai = 0;
    let countXiu = 0;

    for (const algo of ALGORITHMS) {
        let result = null;
        const name = algo.name;
        
        if (name === 'algo_manualPatterns' || name === 'algo_totalScore' || 
            name === 'algo_fibonacci' || name === 'algo_classicPatterns') {
            result = algo(totals);
        } else if (name === 'algo_classicPatterns') {
            result = algo(seq, totals);
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
                
                const result = predictAll(seq, totals);
                
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
        message: 'API Predictor - 35 Algorithms',
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
console.log('🚀 API Predictor - 35 Algorithms');
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
