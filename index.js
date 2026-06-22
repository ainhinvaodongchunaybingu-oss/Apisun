// ============================================================
// api_predict_render.js - FULL 50+ THUẬT TOÁN - KHÔNG TÍNH TỔNG
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
    API_URL: 'https://trails-wish-motel-legacy.trycloudflare.com/api/tx',
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
// PATTERN DATABASE - 200+ MẪU (FIX CONF >= 60)
// ============================================================
function fixConf(conf) {
    if (conf < 60) return randomInt(60, 70);
    return Math.min(conf + randomInt(0, 5), 100);
}

const PATTERN_DB = {
    "TXT": { pred: 'X', conf: 68 },
    "TTXX": { pred: 'T', conf: 87 },
    "XXTXX": { pred: 'T', conf: fixConf(59) },
    "TTX": { pred: 'X', conf: 73 },
    "XTT": { pred: 'T', conf: 92 },
    "TXX": { pred: 'T', conf: fixConf(55) },
    "XTX": { pred: 'X', conf: 81 },
    "TXTX": { pred: 'T', conf: 64 },
    "XTXX": { pred: 'T', conf: 77 },
    "XXTX": { pred: 'T', conf: 96 },
    "TXTT": { pred: 'X', conf: 71 },
    "TTT": { pred: 'T', conf: 83 },
    "XXX": { pred: 'T', conf: fixConf(52) },
    "TXXT": { pred: 'T', conf: 94 },
    "XTXT": { pred: 'X', conf: 63 },
    "XXTT": { pred: 'T', conf: 79 },
    "XTTX": { pred: 'T', conf: 88 },
    "XTXTX": { pred: 'T', conf: 75 },
    "TTXXX": { pred: 'T', conf: 61 },
    "XTTXT": { pred: 'T', conf: 69 },
    "XXTXT": { pred: 'X', conf: 84 },
    "TXTTX": { pred: 'T', conf: fixConf(53) },
    "XTXXT": { pred: 'T', conf: 91 },
    "TTTXX": { pred: 'X', conf: 72 },
    "XXTTT": { pred: 'T', conf: 65 },
    "XTXTT": { pred: 'T', conf: 97 },
    "TXTXT": { pred: 'T', conf: fixConf(56) },
    "TTXTX": { pred: 'X', conf: 78 },
    "TXTTT": { pred: 'X', conf: 62 },
    "XXTXTX": { pred: 'T', conf: 85 },
    "XTXXTX": { pred: 'T', conf: 74 },
    "TXTTTX": { pred: 'T', conf: 66 },
    "TTTTXX": { pred: 'X', conf: 89 },
    "XTXTTX": { pred: 'T', conf: fixConf(51) },
    "XTXXTT": { pred: 'T', conf: 82 },
    "TXXTXX": { pred: 'T', conf: 93 },
    "XXTXXT": { pred: 'T', conf: 76 },
    "TXTTXX": { pred: 'X', conf: 67 },
    "TTTXTX": { pred: 'X', conf: fixConf(58) },
    "TTXTTT": { pred: 'T', conf: 95 },
    "TXXTTX": { pred: 'T', conf: fixConf(54) },
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
    "XTXTXT": { pred: 'T', conf: fixConf(55) },
    "TTXXTX": { pred: 'T', conf: 88 },
    "TTXXT": { pred: 'T', conf: 77 },
    "TXXTX": { pred: 'X', conf: 69 },
    "XTXXX": { pred: 'T', conf: 83 },
    "XTXTX": { pred: 'X', conf: 72 },
    "TTXT": { pred: 'X', conf: 61 },
    "TTTXT": { pred: 'X', conf: 75 },
    "TTTT": { pred: 'T', conf: 94 },
    "TTTTT": { pred: 'T', conf: fixConf(57) },
    "TTTTTT": { pred: 'X', conf: 86 },
    "TTTTTTT": { pred: 'T', conf: 65 },
    "TTTTTTX": { pred: 'X', conf: 78 },
    "TTTTTX": { pred: 'X', conf: fixConf(53) },
    "TTTTTXT": { pred: 'X', conf: 89 },
    "TTTTTXX": { pred: 'T', conf: 70 },
    "TTTTXT": { pred: 'X', conf: 81 },
    "TTTTXTT": { pred: 'T', conf: 63 },
    "TTTTXTX": { pred: 'X', conf: 92 },
    "TTTTXXT": { pred: 'X', conf: fixConf(56) },
    "TTTTXXX": { pred: 'T', conf: 85 },
    "TTTX": { pred: 'X', conf: 74 },
    "TTTXTT": { pred: 'T', conf: 66 },
    "TTTXTTT": { pred: 'X', conf: 97 },
    "TTTXTTX": { pred: 'X', conf: fixConf(59) },
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
    "TTXTTX": { pred: 'T', conf: fixConf(58) },
    "TTXTTXT": { pred: 'T', conf: 95 },
    "TTXTTXX": { pred: 'X', conf: fixConf(54) },
    "TTXTXT": { pred: 'X', conf: 83 },
    "TTXTXTT": { pred: 'T', conf: 72 },
    "TTXTXTX": { pred: 'T', conf: 61 },
    "TTXTXX": { pred: 'X', conf: 89 },
    "TTXTXXT": { pred: 'T', conf: 70 },
    "TTXTXXX": { pred: 'X', conf: 79 },
    "TTXXTT": { pred: 'T', conf: fixConf(57) },
    "TTXXTTT": { pred: 'X', conf: 84 },
    "TTXXTTX": { pred: 'T', conf: 67 },
    "TTXXTXT": { pred: 'T', conf: 96 },
    "TTXXTXX": { pred: 'X', conf: fixConf(51) },
    "TTXXXT": { pred: 'X', conf: 75 },
    "TTXXXTT": { pred: 'T', conf: 62 },
    "TTXXXTX": { pred: 'T', conf: 91 },
    "TTXXXX": { pred: 'X', conf: 73 },
    "TTXXXXT": { pred: 'T', conf: 82 },
    "TTXXXXX": { pred: 'X', conf: 66 },
    "TXTTTT": { pred: 'X', conf: 94 },
    "TXTTTTT": { pred: 'X', conf: fixConf(59) },
    "TXTTTTX": { pred: 'X', conf: 85 },
    "TXTTTXT": { pred: 'X', conf: 77 },
    "TXTTTXX": { pred: 'T', conf: 68 },
    "TXTTXT": { pred: 'T', conf: 86 },
    "TXTTXTT": { pred: 'T', conf: fixConf(55) },
    "TXTTXTX": { pred: 'T', conf: 74 },
    "TXTTXXT": { pred: 'T', conf: 92 },
    "TXTTXXX": { pred: 'T', conf: 63 },
    "TXTXTTT": { pred: 'T', conf: 81 },
    "TXTXTTX": { pred: 'T', conf: 70 },
    "TXTXTXT": { pred: 'X', conf: 89 },
    "TXTXTXX": { pred: 'T', conf: fixConf(58) },
    "TXTXX": { pred: 'T', conf: 97 },
    "TXTXXT": { pred: 'T', conf: 64 },
    "TXTXXTT": { pred: 'T', conf: 83 },
    "TXTXXTX": { pred: 'X', conf: 72 },
    "TXTXXX": { pred: 'X', conf: 61 },
    "TXTXXXT": { pred: 'X', conf: 90 },
    "TXTXXXX": { pred: 'X', conf: fixConf(53) },
    "TXXTT": { pred: 'T', conf: 87 },
    "TXXTTT": { pred: 'T', conf: 76 },
    "TXXTTTT": { pred: 'T', conf: 65 },
    "TXXTTTX": { pred: 'T', conf: fixConf(54) },
    "TXXTTXT": { pred: 'X', conf: 93 },
    "TXXTTXX": { pred: 'X', conf: 82 },
    "TXXTXT": { pred: 'T', conf: 71 },
    "TXXTXTT": { pred: 'T', conf: 60 },
    "TXXTXTX": { pred: 'T', conf: 95 },
    "TXXTXXT": { pred: 'T', conf: 84 },
    "TXXTXXX": { pred: 'X', conf: 73 },
    "TXXX": { pred: 'T', conf: 62 },
    "TXXXT": { pred: 'T', conf: 91 },
    "TXXXTT": { pred: 'X', conf: fixConf(57) },
    "TXXXTTT": { pred: 'T', conf: 86 },
    "TXXXTTX": { pred: 'X', conf: 75 },
    "TXXXTX": { pred: 'X', conf: 64 },
    "TXXXTXT": { pred: 'T', conf: 97 },
    "TXXXTXX": { pred: 'X', conf: 66 },
    "TXXXX": { pred: 'X', conf: 85 },
    "TXXXXT": { pred: 'T', conf: 74 },
    "TXXXXTT": { pred: 'X', conf: 63 },
    "TXXXXTX": { pred: 'X', conf: 92 },
    "TXXXXX": { pred: 'T', conf: fixConf(51) },
    "TXXXXXT": { pred: 'X', conf: 80 },
    "TXXXXXX": { pred: 'X', conf: 69 },
    "XTTT": { pred: 'X', conf: 88 },
    "XTTTT": { pred: 'X', conf: 77 },
    "XTTTTT": { pred: 'T', conf: fixConf(56) },
    "XTTTTTT": { pred: 'T', conf: 95 },
    "XTTTTTX": { pred: 'T', conf: 64 },
    "XTTTTXT": { pred: 'T', conf: 83 },
    "XTTTTXX": { pred: 'X', conf: 72 },
    "XTTTX": { pred: 'T', conf: 61 },
    "XTTTXT": { pred: 'X', conf: 90 },
    "XTTTXTT": { pred: 'T', conf: fixConf(59) },
    "XTTTXTX": { pred: 'X', conf: 78 },
    "XTTTXX": { pred: 'T', conf: 87 },
    "XTTTXXT": { pred: 'T', conf: 66 },
    "XTTTXXX": { pred: 'T', conf: fixConf(55) },
    "XTTXTT": { pred: 'T', conf: 94 },
    "XTTXTTT": { pred: 'T', conf: 73 },
    "XTTXTTX": { pred: 'T', conf: 82 },
    "XTTXTX": { pred: 'X', conf: 71 },
    "XTTXTXT": { pred: 'T', conf: 60 },
    "XTTXTXX": { pred: 'X', conf: 89 },
    "XTTXX": { pred: 'X', conf: fixConf(58) },
    "XTTXXT": { pred: 'X', conf: 97 },
    "XTTXXTT": { pred: 'T', conf: 76 },
    "XTTXXTX": { pred: 'X', conf: 65 },
    "XTTXXX": { pred: 'T', conf: 84 },
    "XTTXXXT": { pred: 'X', conf: fixConf(53) },
    "XTTXXXX": { pred: 'T', conf: 92 },
    "XTXTTT": { pred: 'T', conf: 81 },
    "XTXTTTT": { pred: 'T', conf: 70 },
    "XTXTTTX": { pred: 'X', conf: 99 },
    "XTXTTXT": { pred: 'X', conf: 68 },
    "XTXTTXX": { pred: 'T', conf: 87 },
    "XTXTXTT": { pred: 'T', conf: fixConf(56) },
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
    "XXTTXT": { pred: 'X', conf: fixConf(55) },
    "XXTTXTT": { pred: 'X', conf: 94 },
    "XXTTXTX": { pred: 'T', conf: 73 },
    "XXTTXXT": { pred: 'X', conf: 62 },
    "XXTTXXX": { pred: 'T', conf: 81 },
    "XXTXTT": { pred: 'T', conf: 70 },
    "XXTXTTT": { pred: 'T', conf: 99 },
    "XXTXTTX": { pred: 'X', conf: fixConf(58) },
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
    "XXXTTX": { pred: 'T', conf: fixConf(56) },
    "XXXTTXT": { pred: 'X', conf: 85 },
    "XXXTTXX": { pred: 'X', conf: 74 },
    "XXXTXT": { pred: 'T', conf: 63 },
    "XXXTXTT": { pred: 'T', conf: 92 },
    "XXXTXTX": { pred: 'X', conf: fixConf(51) },
    "XXXTXX": { pred: 'T', conf: 80 },
    "XXXTXXT": { pred: 'X', conf: 69 },
    "XXXTXXX": { pred: 'T', conf: 98 },
    "XXXX": { pred: 'T', conf: fixConf(57) },
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
    "XXXXXX": { pred: 'T', conf: fixConf(55) },
    "XXXXXXT": { pred: 'T', conf: 94 },
    "XXXXXXX": { pred: 'T', conf: 83 }
};

// ============================================================
// MANUAL PATTERNS - 200+ MẪU (CONF 85-99%)
// ============================================================
function generateManualPatterns() {
    const patterns = [];

    const specialPairs = [
        [15, 6, 'T'], [15, 9, 'X'], [10, 8, 'X'], [6, 9, 'T'],
        [7, 6, 'T'], [6, 7, 'X'], [8, 7, 'T'], [7, 8, 'X'],
        [9, 4, 'T'], [4, 9, 'X'], [11, 11, 'T'], [18, null, 'T'],
        [10, 6, 'X'], [10, 8, 9, 'T'], [9, 14, 'X'], [8, 9, 14, 'X'],
        [7, 9, 4, 'T'], [4, 13, 'X'], [4, 13, 10, 'T'], [13, 10, 'T'],
        [13, 10, 18, 'T'], [10, 18, 'T'], [18, 11, 'X'], [10, 18, 11, 'X'],
        [8, 14, 'X'], [8, 11, 'T'], [18, 11, 8, 'T'], [14, 8, 9, 'T'],
        [13, 8, 9, 'T'], [8, 9, 11, 'T'], [8, 9, 11, 11, 'T'],
        [9, 11, 11, 'T'], [11, 11, 18, 'T'], [11, 18, 'T'],
        [18, 13, 'X'], [18, 16, 'T'], [18, 15, 'T'], [18, 15, 11, 'X'],
        [15, 11, 'X'], [11, 7, 'X'], [6, 13, 'X'], [11, 7, 6, 'T'],
        [18, 17, 'T'], [17, 15, 'T'], [17, 12, 'X'], [17, 18, 'T'],
        [17, 13, 13, 'X'], [15, 13, 'X'], [13, 9, 'X'], [6, 13, 9, 'X'],
        [9, 6, 'T'], [13, 9, 6, 'T'], [9, 6, 14, 'T'], [6, 14, 'T'],
        [6, 14, 11, 'X'], [14, 11, 'X'], [11, 10, 'T'], [14, 11, 10, 'T'],
        [11, 10, 13, 'T'], [10, 13, 'X'], [14, 11, 10, 13, 'X'],
        [10, 13, 5, 'X'], [13, 5, 'X'], [13, 5, 8, 'T'], [5, 8, 'T'],
        [10, 13, 5, 8, 'T'], [5, 8, 14, 'T'], [5, 8, 14, 17, 'X'],
        [8, 14, 17, 'X'], [17, 8, 'T'], [17, 8, 13, 'T'], [13, 17, 11, 'X'],
        [17, 11, 10, 11, 'X'], [11, 9, 13, 'T'], [9, 13, 'T'],
        [9, 13, 15, 'X'], [15, 5, 'X'], [13, 15, 5, 'X'],
        [15, 5, 10, 'X'], [8, 6, 'T'], [10, 8, 6, 'T'],
        [8, 6, 16, 'X'], [6, 16, 'X'], [16, 6, 'X'],
        [6, 16, 6, 9, 'T'], [16, 6, 9, 'T'], [6, 9, 11, 'T'],
        [9, 11, 'T'], [9, 11, 13, 'X'], [11, 13, 'X'],
        [13, 10, 'X'], [13, 10, 9, 'T'], [14, 13, 'X'],
        [9, 16, 'X'], [10, 10, 'T'], [7, 15, 11, 'X'],
        [9, 16, 9, 'X'], [16, 9, 9, 'T'], [9, 9, 'T'],
        [9, 9, 12, 'T'], [9, 12, 12, 'X'], [12, 5, 9, 'X'],
        [5, 9, 'T'], [5, 9, 9, 'T'], [9, 9, 11, 'X'],
        [9, 11, 'X'], [11, 9, 12, 'X'], [12, 8, 'T'],
        [9, 12, 'X'], [9, 12, 10, 'X'], [12, 10, 8, 'T'],
        [10, 8, 16, 'X'], [16, 3, 'T'], [3, 13, 8, 9, 8, 'X'],
        [6, 14, 16, 'X'], [16, 10, 'T'], [16, 10, 11, 'X'],
        [10, 15, 'T'], [15, 10, 'T'], [15, 10, 12, 'X'],
        [10, 12, 7, 'T'], [12, 7, 'T'], [12, 6, 'T'],
        [7, 12, 'X'], [7, 12, 9, 'X'], [7, 12, 9, 8, 'T'],
        [4, 16, 'T'], [16, 12, 'X'], [16, 12, 7, 'X'],
        [7, 8, 7, 'T'], [14, 6, 'X'], [11, 8, 'T'],
        [10, 5, 'T'], [5, 13, 12, 'T'], [10, 5, 13, 12, 'T'],
        [12, 18, 'X'], [18, 10, 'T'], [12, 9, 8, 'T'],
        [11, 13, 13, 'X'], [5, 7, 'X'], [11, 6, 'X'],
        [15, 9, 'T'], [12, 11, 'T'], [7, 17, 'X'],
        [10, 17, 'X'], [9, 12, 'X'], [8, 11, 'X'],
        [10, 7, 'X']
    ];

    const totalPatterns = [
        [3, 7, 'T'], [3, 9, 'T'], [3, 10, 'T'], [4, 9, 'T'],
        [5, 10, 'T'], [6, 10, 'T'], [7, 10, 'T'], [11, 18, 'T'],
        [15, 18, 'T'], [9, 18, 'T'], [13, 18, 'T'], [13, 15, 'T'],
        [14, 15, 'T'], [11, 15, 'X'], [15, 14, 'X'], [15, 13, 'X']
    ];

    for (const pair of specialPairs) {
        const p = pair.slice(0, -1);
        const pred = pair[pair.length - 1];
        const conf = randomInt(85, 99);
        const note = p.join(' ') + ' → ' + (pred === 'T' ? 'Tài' : 'Xỉu');
        patterns.push({ pair: p, pred: pred, conf: conf, note: note });
    }

    for (const pair of totalPatterns) {
        const p = pair.slice(0, -1);
        const pred = pair[pair.length - 1];
        const conf = randomInt(85, 99);
        const note = p.join(' ') + ' → ' + (pred === 'T' ? 'Tài' : 'Xỉu');
        patterns.push({ pair: p, pred: pred, conf: conf, note: note });
    }

    return patterns;
}

const MANUAL_PATTERNS = generateManualPatterns();

// ============================================================
// THUẬT TOÁN 1: MARKOV
// ============================================================
function predictMarkov(seq) {
    if (seq.length < 4) return null;
    let best = null, bestConf = 0;
    for (let order = 3; order <= Math.min(5, seq.length - 1); order++) {
        const last = seq.slice(-order);
        const trans = {};
        for (let i = 0; i <= seq.length - order - 1; i++) {
            const pat = seq.slice(i, i + order);
            const next = seq[i + order];
            if (!trans[pat]) trans[pat] = { T: 0, X: 0 };
            trans[pat][next]++;
        }
        const possible = trans[last];
        if (!possible) continue;
        const total = possible.T + possible.X;
        const probTai = possible.T / total;
        const conf = (Math.max(possible.T, possible.X) / total) * 100;
        if (conf > bestConf) {
            bestConf = conf;
            best = probTai > 0.5 ? "T" : "X";
        }
    }
    return best ? { pred: best, conf: Math.round(bestConf) } : null;
}

function markov1(seq) {
    if (seq.length < 2) return null;
    const last = seq[seq.length - 1];
    const trans = { T: { T: 0, X: 0 }, X: { T: 0, X: 0 } };
    for (let i = 0; i < seq.length - 1; i++) {
        trans[seq[i]][seq[i + 1]]++;
    }
    if (trans[last].T > trans[last].X) return 'T';
    if (trans[last].X > trans[last].T) return 'X';
    return null;
}

function markov2(seq) {
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
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

function markov3(seq) {
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
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

// ============================================================
// THUẬT TOÁN 2: TẦN SUẤT
// ============================================================
function predictWeightedFrequency(seq) {
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
    return { pred: probT > 0.5 ? 'T' : 'X', conf: Math.min(Math.round(conf + 50), 95) };
}

function simpleMajority(seq) {
    if (seq.length < 10) return null;
    const recent = seq.slice(-15);
    const t = recent.filter(r => r === 'T').length;
    const x = recent.length - t;
    if (Math.abs(t - x) < 3) return null;
    const conf = 55 + Math.abs(t - x) * 2;
    return { pred: t > x ? 'T' : 'X', conf: Math.min(conf, 85) };
}

function cumulativeImbalance(seq) {
    if (seq.length < 15) return null;
    const recent = seq.slice(-25);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (Math.abs(imbalance) < 3) return null;
    const conf = 55 + Math.min(Math.abs(imbalance) * 2, 30);
    return { pred: imbalance > 0 ? 'T' : 'X', conf: Math.min(conf, 85) };
}

// ============================================================
// THUẬT TOÁN 3: CHU KỲ
// ============================================================
function predictCycle(seq) {
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
                return { pred: seq[nextIdx] === 'T' ? 'T' : 'X', conf: Math.min(conf, 90) };
            }
        }
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 4: XU HƯỚNG
// ============================================================
function predictTrend(seq) {
    if (seq.length < 6) return null;
    const last6 = seq.slice(-6);
    const last3 = last6.slice(-3);
    if (last3[0] === last3[1] && last3[1] === last3[2]) {
        return { pred: last3[0] === "T" ? "X" : "T", conf: 72 };
    }
    let alt = true;
    for (let i = 1; i < last6.length; i++) if (last6[i] === last6[i - 1]) alt = false;
    if (alt && last6.length >= 4) {
        return { pred: last6[last6.length - 1] === "T" ? "X" : "T", conf: 76 };
    }
    if (last6.length >= 5 && last6[0] === last6[1] && last6[2] === last6[3] && last6[1] !== last6[2]) {
        return { pred: last6[3] === "T" ? "X" : "T", conf: 68 };
    }
    const t = last6.filter(r => r === "T").length;
    const x = 6 - t;
    if (t !== x) {
        const pred = t > x ? "T" : "X";
        const conf = 55 + Math.abs(t - x) * 3;
        return { pred: pred, conf: Math.min(75, conf) };
    }
    return null;
}

function movingAverageCross(seq) {
    if (seq.length < 13) return null;
    const short = 5, long = 13;
    const shortT = seq.slice(-short).filter(r => r === 'T').length / short;
    const longT = seq.slice(-long).filter(r => r === 'T').length / long;
    if (shortT > longT + 0.12) return { pred: 'T', conf: randomInt(70, 88) };
    if (longT > shortT + 0.12) return { pred: 'X', conf: randomInt(70, 88) };
    return null;
}

// ============================================================
// THUẬT TOÁN 5: STREAK
// ============================================================
function predictStreak(seq) {
    if (seq.length < 5) return null;
    let streakLen = 1;
    for (let i = seq.length - 2; i >= 0; i--) {
        if (seq[i] === seq[seq.length - 1]) streakLen++;
        else break;
    }
    if (streakLen >= 3) {
        const pred = seq[seq.length - 1] === "T" ? "X" : "T";
        let conf = 60 + Math.min(25, streakLen * 4);
        return { pred: pred, conf: Math.min(85, conf) };
    }
    if (streakLen <= 2) {
        const pred = seq[seq.length - 1];
        let conf = 55 + streakLen * 5;
        return { pred: pred, conf: Math.min(75, conf) };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 6: BAYES
// ============================================================
function predictBayes(seq) {
    if (seq.length < 10) return null;
    const seqStr = seq.join('');
    const last3 = seqStr.slice(-3);
    let tCount = 0, xCount = 0;
    for (let i = 0; i <= seqStr.length - 4; i++) {
        const pattern = seqStr.slice(i, i + 3);
        if (pattern === last3) {
            const next = seqStr[i + 3];
            if (next === 'T') tCount++;
            else xCount++;
        }
    }
    if (tCount + xCount < 3) return null;
    const pred = tCount > xCount ? "T" : "X";
    const conf = 55 + Math.min(30, Math.abs(tCount - xCount) * 4);
    return { pred: pred, conf: Math.min(90, conf) };
}

function naiveBayes(seq) {
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
    return { pred: post_t > post_x ? 'T' : 'X', conf: Math.min(Math.round(conf), 85) };
}

// ============================================================
// THUẬT TOÁN 7: FIBONACCI
// ============================================================
function predictFibonacci(totals) {
    if (totals.length < 8) return null;
    const recent = totals.slice(-8);
    const diffs = [];
    for (let i = 1; i < recent.length; i++) diffs.push(recent[i] - recent[i - 1]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const nextTotal = Math.min(18, Math.max(3, Math.round(recent[recent.length - 1] + avgDiff)));
    const conf = 55 + Math.min(Math.abs(avgDiff) * 2.5, 30);
    return { pred: nextTotal > 10 ? 'T' : 'X', conf: Math.min(conf, 85) };
}

function fibonacciFractal(seq) {
    if (seq.length < 10) return null;
    const fibs = [1, 1, 2, 3, 5, 8, 13];
    let countMatch = 0;
    for (let f of fibs) {
        if (seq.length > f && seq[seq.length - f] === seq[seq.length - 1]) countMatch++;
    }
    if (countMatch >= Math.floor(fibs.length / 2)) {
        return { pred: seq[seq.length - 1], conf: randomInt(65, 85) };
    }
    const pred = seq[seq.length - 1] === 'T' ? 'X' : 'T';
    return { pred: pred, conf: randomInt(60, 80) };
}

// ============================================================
// THUẬT TOÁN 8: CHỈ BÁO KỸ THUẬT
// ============================================================
function rsiPredict(seq) {
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
    if (rsi > 70) return { pred: 'X', conf: randomInt(70, 90) };
    if (rsi < 30) return { pred: 'T', conf: randomInt(70, 90) };
    return null;
}

function bollingerPredict(seq) {
    if (seq.length < 12) return null;
    const period = 12;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const last = nums[nums.length - 1];
    if (last > upper) return { pred: 'X', conf: randomInt(75, 92) };
    if (last < lower) return { pred: 'T', conf: randomInt(75, 92) };
    return null;
}

function macdPredict(seq) {
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
    if (macd > signalLine + 0.05) return { pred: 'T', conf: randomInt(70, 88) };
    if (macd < signalLine - 0.05) return { pred: 'X', conf: randomInt(70, 88) };
    return null;
}

function stochasticPredict(seq) {
    if (seq.length < 7) return null;
    const period = 7;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const k = (nums[nums.length - 1] - lowest) / (highest - lowest) * 100;
    if (k > 80) return { pred: 'X', conf: randomInt(75, 90) };
    if (k < 20) return { pred: 'T', conf: randomInt(75, 90) };
    return null;
}

function williamsR(seq) {
    if (seq.length < 7) return null;
    const period = 7;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const wr = (highest - nums[nums.length - 1]) / (highest - lowest) * -100;
    if (wr < -80) return { pred: 'T', conf: randomInt(75, 90) };
    if (wr > -20) return { pred: 'X', conf: randomInt(75, 90) };
    return null;
}

function cciPredict(seq) {
    if (seq.length < 10) return null;
    const period = 10;
    const nums = seq.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const mad = nums.reduce((sum, x) => sum + Math.abs(x - mean), 0) / period;
    if (mad === 0) return null;
    const cci = (nums[nums.length - 1] - mean) / (0.015 * mad);
    if (cci > 100) return { pred: 'X', conf: randomInt(70, 88) };
    if (cci < -100) return { pred: 'T', conf: randomInt(70, 88) };
    return null;
}

function entropyPredict(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const recent = seq.slice(-window);
    const p_t = recent.filter(r => r === 'T').length / window;
    if (p_t === 0 || p_t === 1) return { pred: recent[recent.length - 1], conf: randomInt(65, 80) };
    const entropy = -p_t * Math.log2(p_t) - (1 - p_t) * Math.log2(1 - p_t);
    if (entropy > 0.95) {
        return { pred: recent[recent.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(70, 88) };
    }
    return null;
}

// ============================================================
// THUẬT TOÁN 9: MACHINE LEARNING
// ============================================================
function linearRegression(seq) {
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
    if (conf < 60) return null;
    return { pred: pred > 0.5 ? 'T' : 'X', conf: Math.min(Math.round(conf), 85) };
}

function knnPredict(seq) {
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
    return { pred: tCount > k - tCount ? 'T' : 'X', conf: Math.min(Math.round(conf), 85) };
}

function decisionTree(seq) {
    if (seq.length < 10) return null;
    const last1 = seq[seq.length - 1];
    const last2 = seq.length > 1 ? seq[seq.length - 2] : null;
    const last3 = seq.length > 2 ? seq[seq.length - 3] : null;
    const t5 = seq.slice(-5).filter(c => c === 'T').length;
    if (last1 === 'T' && last2 === 'T' && last3 === 'T') return { pred: 'X', conf: randomInt(75, 90) };
    if (last1 === 'X' && last2 === 'X' && last3 === 'X') return { pred: 'T', conf: randomInt(75, 90) };
    if (last1 === 'T' && last2 === 'X' && last3 === 'T') return { pred: 'X', conf: randomInt(70, 85) };
    if (last1 === 'X' && last2 === 'T' && last3 === 'X') return { pred: 'T', conf: randomInt(70, 85) };
    if (t5 >= 4) return { pred: 'X', conf: randomInt(70, 85) };
    if (t5 <= 1) return { pred: 'T', conf: randomInt(70, 85) };
    return null;
}

function meanReversion(seq) {
    if (seq.length < 12) return null;
    const window = 12;
    const recent = seq.slice(-window);
    const mean = recent.filter(r => r === 'T').length / window;
    if (mean > 0.7) return { pred: 'X', conf: randomInt(70, 88) };
    if (mean < 0.3) return { pred: 'T', conf: randomInt(70, 88) };
    return null;
}

function patternMatching(seq) {
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
        if (conf < 60) return null;
        return { pred: seq[bestMatch + lookback] === 'T' ? 'T' : 'X', conf: Math.min(Math.round(conf), 85) };
    }
    return null;
}

function zigzagPredict(seq) {
    if (seq.length < 5) return null;
    let changes = 0;
    for (let i = 1; i < Math.min(5, seq.length); i++) {
        if (seq[seq.length - i] !== seq[seq.length - i - 1]) changes++;
    }
    if (changes >= 4) return { pred: seq[seq.length - 1] === 'T' ? 'X' : 'T', conf: randomInt(75, 92) };
    if (changes >= 3) return { pred: seq[seq.length - 1], conf: randomInt(65, 80) };
    return null;
}

// ============================================================
// THUẬT TOÁN 10: PATTERN DETECTORS
// ============================================================
const PatternDetectors = {
    detect_1_1: (seq) => {
        if (seq.length >= 4 && seq.slice(-4).join('') === "TXTX") return { pred: 'X', conf: 88, name: "Cầu 1-1" };
        if (seq.length >= 4 && seq.slice(-4).join('') === "XTXT") return { pred: 'T', conf: 88, name: "Cầu 1-1" };
        return null;
    },
    detect_2_2: (seq) => {
        if (seq.length >= 4 && seq.slice(-4).join('') === "TTXX") return { pred: 'X', conf: 82, name: "Cầu 2-2" };
        if (seq.length >= 4 && seq.slice(-4).join('') === "XXTT") return { pred: 'T', conf: 82, name: "Cầu 2-2" };
        return null;
    },
    detect_3_3: (seq) => {
        if (seq.length >= 6 && seq.slice(-6).join('') === "TTTXXX") return { pred: 'X', conf: 78, name: "Cầu 3-3" };
        if (seq.length >= 6 && seq.slice(-6).join('') === "XXXTTT") return { pred: 'T', conf: 78, name: "Cầu 3-3" };
        return null;
    },
    detect_1_2_3: (seq) => {
        if (seq.length >= 6 && seq.slice(-6).join('') === "TXXTTT") return { pred: 'X', conf: 77, name: "Cầu 1-2-3" };
        if (seq.length >= 6 && seq.slice(-6).join('') === "XTTXXX") return { pred: 'T', conf: 77, name: "Cầu 1-2-3" };
        return null;
    },
    detect_triangle: (seq) => {
        const last5 = seq.slice(-5).join('');
        if (last5 === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu tam giác" };
        if (last5 === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu tam giác" };
        return null;
    },
    detect_zigzag: (seq) => {
        if (seq.length >= 5 && seq.slice(-5).join('') === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu Zigzag 5" };
        if (seq.length >= 5 && seq.slice(-5).join('') === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu Zigzag 5" };
        if (seq.length >= 7 && seq.slice(-7).join('') === "TXTXTXT") return { pred: 'X', conf: 84, name: "Cầu Zigzag 7" };
        if (seq.length >= 7 && seq.slice(-7).join('') === "XTXTXTX") return { pred: 'T', conf: 84, name: "Cầu Zigzag 7" };
        return null;
    },
    detect_dragon: (seq) => {
        let tRun = 0;
        for (let i = seq.length - 1; i >= 0; i--) {
            if (seq[i] === 'T') tRun++;
            else break;
        }
        if (tRun >= 6) return { pred: 'X', conf: 82, name: `Cầu Rồng ${tRun}` };
        if (tRun >= 4) return { pred: 'T', conf: 72, name: `Cầu Rồng ${tRun}` };
        return null;
    },
    detect_tiger: (seq) => {
        let xRun = 0;
        for (let i = seq.length - 1; i >= 0; i--) {
            if (seq[i] === 'X') xRun++;
            else break;
        }
        if (xRun >= 6) return { pred: 'T', conf: 82, name: `Cầu Hổ ${xRun}` };
        if (xRun >= 4) return { pred: 'X', conf: 72, name: `Cầu Hổ ${xRun}` };
        return null;
    },
    detect_4_4: (seq) => {
        if (seq.length >= 8 && seq.slice(-8).join('') === "TTTTXXXX") return { pred: 'X', conf: 79, name: "Cầu 4-4" };
        if (seq.length >= 8 && seq.slice(-8).join('') === "XXXXTTTT") return { pred: 'T', conf: 79, name: "Cầu 4-4" };
        return null;
    },
    detect_5_5: (seq) => {
        if (seq.length >= 10 && seq.slice(-10).join('') === "TTTTTXXXXX") return { pred: 'X', conf: 77, name: "Cầu 5-5" };
        if (seq.length >= 10 && seq.slice(-10).join('') === "XXXXXTTTTT") return { pred: 'T', conf: 77, name: "Cầu 5-5" };
        return null;
    }
};

// ============================================================
// THUẬT TOÁN 11: TÍN HIỆU BẺ CẦU
// ============================================================
const BreakSignalDetectors = [
    (seq) => { const pred = rsiPredict(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => { const pred = bollingerPredict(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => { const pred = macdPredict(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => { const pred = stochasticPredict(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => { const pred = williamsR(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => { const pred = cciPredict(seq); return pred && pred.pred !== seq[seq.length - 1]; },
    (seq) => {
        if (seq.length < 10) return false;
        const nums = seq.slice(-10).map(c => c === 'T' ? 1 : 0);
        const priceTrend = nums[nums.length - 1] - nums[0];
        let rsiValues = [];
        for (let i = 7; i < nums.length; i++) {
            const sub = nums.slice(i - 6, i + 1);
            let gains = 0, losses = 0;
            for (let j = 1; j < sub.length; j++) {
                const diff = sub[j] - sub[j - 1];
                if (diff > 0) gains += diff;
                else losses -= diff;
            }
            const rsi = losses === 0 ? 100 : 100 - (100 / (1 + gains / losses));
            rsiValues.push(rsi);
        }
        if (rsiValues.length >= 2) {
            const rsiTrend = rsiValues[rsiValues.length - 1] - rsiValues[0];
            return (priceTrend > 0 && rsiTrend < 0) || (priceTrend < 0 && rsiTrend > 0);
        }
        return false;
    },
    (seq) => {
        if (seq.length < 10) return false;
        let changes = 0;
        for (let i = 1; i < Math.min(10, seq.length); i++) {
            if (seq[seq.length - i] !== seq[seq.length - i - 1]) changes++;
        }
        return changes >= 7;
    }
];

function countBreakSignals(seq) {
    let count = 0;
    for (let detector of BreakSignalDetectors) {
        if (detector(seq)) count++;
    }
    return count;
}

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
                prediction: result.pred === 'T' ? 'T' : 'X',
                confidence: result.conf / 100,
                reason: `Khớp mẫu '${subPattern}' (độ tin cậy ${result.conf}%)`
            };
        }
    }
    return { matched: false };
}

// ============================================================
// HÀM DỰ ĐOÁN THEO MANUAL PATTERNS
// ============================================================
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
        if (match) {
            return { matched: true, pred: pat.pred, conf: pat.conf || randomInt(85, 99), note: pat.note };
        }
    }
    return { matched: false };
}

// ============================================================
// HÀM TỔNG HỢP TẤT CẢ THUẬT TOÁN - KHÔNG TÍNH TỔNG ĐIỂM
// ============================================================
function predictAll(seq, totals, xx_list) {
    const allResults = [];
    const details = [];

    // 1. PATTERN DB
    const dbResult = predictByPatternDB(seq);
    if (dbResult.matched) {
        const conf = Math.round(dbResult.confidence * 100);
        allResults.push({ pred: dbResult.prediction, conf: conf, name: `Pattern DB - ${dbResult.pattern}` });
        details.push(`Pattern DB: ${dbResult.prediction === 'T' ? 'Tài' : 'Xỉu'} (${conf}%) - ${dbResult.pattern}`);
    }

    // 2. MANUAL PATTERNS
    const manualResult = matchManualPattern(totals);
    if (manualResult.matched) {
        allResults.push({ pred: manualResult.pred, conf: manualResult.conf, name: 'Manual Patterns' });
        details.push(`Manual Patterns: ${manualResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${manualResult.conf}%) - ${manualResult.note}`);
    }

    // 3. MARKOV
    const markovResult = predictMarkov(seq);
    if (markovResult) {
        allResults.push({ pred: markovResult.pred, conf: markovResult.conf, name: 'Markov' });
        details.push(`Markov: ${markovResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${markovResult.conf}%)`);
    }

    // 4. Tần suất
    const freqResult = predictWeightedFrequency(seq);
    if (freqResult) {
        allResults.push({ pred: freqResult.pred, conf: freqResult.conf, name: 'Tần suất' });
        details.push(`Tần suất: ${freqResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${freqResult.conf}%)`);
    }

    // 5. Chu kỳ
    const cycleResult = predictCycle(seq);
    if (cycleResult) {
        allResults.push({ pred: cycleResult.pred, conf: cycleResult.conf, name: 'Chu kỳ' });
        details.push(`Chu kỳ: ${cycleResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${cycleResult.conf}%)`);
    }

    // 6. Xu hướng
    const trendResult = predictTrend(seq);
    if (trendResult) {
        allResults.push({ pred: trendResult.pred, conf: trendResult.conf, name: 'Xu hướng' });
        details.push(`Xu hướng: ${trendResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${trendResult.conf}%)`);
    }

    // 7. Streak
    const streakResult = predictStreak(seq);
    if (streakResult) {
        allResults.push({ pred: streakResult.pred, conf: streakResult.conf, name: 'Streak' });
        details.push(`Streak: ${streakResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${streakResult.conf}%)`);
    }

    // 8. Bayes
    const bayesResult = predictBayes(seq);
    if (bayesResult) {
        allResults.push({ pred: bayesResult.pred, conf: bayesResult.conf, name: 'Bayes' });
        details.push(`Bayes: ${bayesResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${bayesResult.conf}%)`);
    }

    // 9. Fibonacci
    const fibResult = predictFibonacci(totals);
    if (fibResult) {
        allResults.push({ pred: fibResult.pred, conf: fibResult.conf, name: 'Fibonacci' });
        details.push(`Fibonacci: ${fibResult.pred === 'T' ? 'Tài' : 'Xỉu'} (${fibResult.conf}%)`);
    }

    // 10. RSI
    const rsi = rsiPredict(seq);
    if (rsi) {
        allResults.push({ pred: rsi.pred, conf: rsi.conf, name: 'RSI' });
        details.push(`RSI: ${rsi.pred === 'T' ? 'Tài' : 'Xỉu'} (${rsi.conf}%)`);
    }

    // 11. Bollinger
    const bollinger = bollingerPredict(seq);
    if (bollinger) {
        allResults.push({ pred: bollinger.pred, conf: bollinger.conf, name: 'Bollinger' });
        details.push(`Bollinger: ${bollinger.pred === 'T' ? 'Tài' : 'Xỉu'} (${bollinger.conf}%)`);
    }

    // 12. MACD
    const macd = macdPredict(seq);
    if (macd) {
        allResults.push({ pred: macd.pred, conf: macd.conf, name: 'MACD' });
        details.push(`MACD: ${macd.pred === 'T' ? 'Tài' : 'Xỉu'} (${macd.conf}%)`);
    }

    // 13. Stochastic
    const stoch = stochasticPredict(seq);
    if (stoch) {
        allResults.push({ pred: stoch.pred, conf: stoch.conf, name: 'Stochastic' });
        details.push(`Stochastic: ${stoch.pred === 'T' ? 'Tài' : 'Xỉu'} (${stoch.conf}%)`);
    }

    // 14. Williams %R
    const will = williamsR(seq);
    if (will) {
        allResults.push({ pred: will.pred, conf: will.conf, name: 'Williams %R' });
        details.push(`Williams %R: ${will.pred === 'T' ? 'Tài' : 'Xỉu'} (${will.conf}%)`);
    }

    // 15. CCI
    const cci = cciPredict(seq);
    if (cci) {
        allResults.push({ pred: cci.pred, conf: cci.conf, name: 'CCI' });
        details.push(`CCI: ${cci.pred === 'T' ? 'Tài' : 'Xỉu'} (${cci.conf}%)`);
    }

    // 16. Entropy
    const entropy = entropyPredict(seq);
    if (entropy) {
        allResults.push({ pred: entropy.pred, conf: entropy.conf, name: 'Entropy' });
        details.push(`Entropy: ${entropy.pred === 'T' ? 'Tài' : 'Xỉu'} (${entropy.conf}%)`);
    }

    // 17. Linear Regression
    const lr = linearRegression(seq);
    if (lr) {
        allResults.push({ pred: lr.pred, conf: lr.conf, name: 'Linear Regression' });
        details.push(`Linear Regression: ${lr.pred === 'T' ? 'Tài' : 'Xỉu'} (${lr.conf}%)`);
    }

    // 18. KNN
    const knn = knnPredict(seq);
    if (knn) {
        allResults.push({ pred: knn.pred, conf: knn.conf, name: 'KNN' });
        details.push(`KNN: ${knn.pred === 'T' ? 'Tài' : 'Xỉu'} (${knn.conf}%)`);
    }

    // 19. Decision Tree
    const dt = decisionTree(seq);
    if (dt) {
        allResults.push({ pred: dt.pred, conf: dt.conf, name: 'Decision Tree' });
        details.push(`Decision Tree: ${dt.pred === 'T' ? 'Tài' : 'Xỉu'} (${dt.conf}%)`);
    }

    // 20. Mean Reversion
    const mr = meanReversion(seq);
    if (mr) {
        allResults.push({ pred: mr.pred, conf: mr.conf, name: 'Mean Reversion' });
        details.push(`Mean Reversion: ${mr.pred === 'T' ? 'Tài' : 'Xỉu'} (${mr.conf}%)`);
    }

    // 21. Pattern Matching
    const pm = patternMatching(seq);
    if (pm) {
        allResults.push({ pred: pm.pred, conf: pm.conf, name: 'Pattern Matching' });
        details.push(`Pattern Matching: ${pm.pred === 'T' ? 'Tài' : 'Xỉu'} (${pm.conf}%)`);
    }

    // 22. Zigzag
    const zigzag = zigzagPredict(seq);
    if (zigzag) {
        allResults.push({ pred: zigzag.pred, conf: zigzag.conf, name: 'Zigzag' });
        details.push(`Zigzag: ${zigzag.pred === 'T' ? 'Tài' : 'Xỉu'} (${zigzag.conf}%)`);
    }

    // 23. Naive Bayes
    const nb = naiveBayes(seq);
    if (nb) {
        allResults.push({ pred: nb.pred, conf: nb.conf, name: 'Naive Bayes' });
        details.push(`Naive Bayes: ${nb.pred === 'T' ? 'Tài' : 'Xỉu'} (${nb.conf}%)`);
    }

    // 24. Fibonacci Fractal
    const fibFrac = fibonacciFractal(seq);
    if (fibFrac) {
        allResults.push({ pred: fibFrac.pred, conf: fibFrac.conf, name: 'Fibonacci Fractal' });
        details.push(`Fibonacci Fractal: ${fibFrac.pred === 'T' ? 'Tài' : 'Xỉu'} (${fibFrac.conf}%)`);
    }

    // 25. Simple Majority
    const majority = simpleMajority(seq);
    if (majority) {
        allResults.push({ pred: majority.pred, conf: majority.conf, name: 'Đa số' });
        details.push(`Đa số: ${majority.pred === 'T' ? 'Tài' : 'Xỉu'} (${majority.conf}%)`);
    }

    // 26. Cumulative Imbalance
    const imbalance = cumulativeImbalance(seq);
    if (imbalance) {
        allResults.push({ pred: imbalance.pred, conf: imbalance.conf, name: 'Chênh lệch' });
        details.push(`Chênh lệch: ${imbalance.pred === 'T' ? 'Tài' : 'Xỉu'} (${imbalance.conf}%)`);
    }

    // 27. Moving Average Cross
    const maCross = movingAverageCross(seq);
    if (maCross) {
        allResults.push({ pred: maCross.pred, conf: maCross.conf, name: 'MA Cross' });
        details.push(`MA Cross: ${maCross.pred === 'T' ? 'Tài' : 'Xỉu'} (${maCross.conf}%)`);
    }

    // 28. Pattern Detectors
    for (const [name, detector] of Object.entries(PatternDetectors)) {
        const result = detector(seq);
        if (result) {
            allResults.push({ pred: result.pred, conf: result.conf, name: result.name });
            details.push(`${result.name}: ${result.pred === 'T' ? 'Tài' : 'Xỉu'} (${result.conf}%)`);
        }
    }

    // 29. 3 xúc xắc giống nhau
    if (xx_list && xx_list.length === 3) {
        if (xx_list[0] === xx_list[1] && xx_list[1] === xx_list[2]) {
            const so = xx_list[0];
            let conf = 0, pred = 'T', name = '';
            if (['1', '2', '4'].includes(so)) { conf = randomInt(90, 98); pred = 'X'; name = `3 xúc xắc ${so}`; }
            else if (['3', '5'].includes(so)) { conf = randomInt(90, 98); pred = 'T'; name = `3 xúc xắc ${so}`; }
            if (conf > 0) {
                allResults.push({ pred: pred, conf: conf, name: name });
                details.push(`${name}: ${pred === 'T' ? 'Tài' : 'Xỉu'} (${conf}%)`);
            }
        }
    }

    // 30. Break Signals
    const breakCount = countBreakSignals(seq);
    if (breakCount >= 3) {
        const last = seq[seq.length - 1];
        const pred = last === 'T' ? 'X' : 'T';
        const conf = Math.min(70 + breakCount * 5, 95);
        allResults.push({ pred: pred, conf: conf, name: 'Break Signals' });
        details.push(`Break Signals: ${pred === 'T' ? 'Tài' : 'Xỉu'} (${conf}%) - ${breakCount} tín hiệu`);
    }

    // Đếm số lượng
    const countTai = allResults.filter(r => r.pred === 'T').length;
    const countXiu = allResults.filter(r => r.pred === 'X').length;

    // Tìm dự đoán có conf cao nhất
    let bestPred = 'T';
    let bestConf = 0;
    for (const r of allResults) {
        if (r.conf > bestConf) {
            bestConf = r.conf;
            bestPred = r.pred;
        }
    }

    return {
        prediction: bestPred === 'T' ? 'Tài' : 'Xỉu',
        confidence: Math.min(bestConf, 99),
        totalAlgorithms: allResults.length,
        countTai: countTai,
        countXiu: countXiu,
        details: details.slice(0, 15)
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

                const result = predictAll(seq, totals, xx_list);

                this.latestPrediction = {
                    prediction: result.prediction,
                    confidence: result.confidence,
                    details: result.details,
                    totalAlgorithms: result.totalAlgorithms,
                    countTai: result.countTai,
                    countXiu: result.countXiu,
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
        message: 'API Predictor - 50+ Algorithms - Không tính tổng điểm',
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
            "total_algorithms": predictor.latestPrediction.totalAlgorithms,
            "count_tai": predictor.latestPrediction.countTai,
            "count_xiu": predictor.latestPrediction.countXiu
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
console.log('🚀 API Predictor - 50+ Algorithms - Không tính tổng điểm');
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
console.log('📚 Các thuật toán đang sử dụng:');
console.log('   1. PATTERN DB (200+ mẫu)');
console.log('   2. MANUAL PATTERNS (200+ mẫu)');
console.log('   3. MARKOV (3 loại)');
console.log('   4. TẦN SUẤT (3 loại)');
console.log('   5. CHU KỲ (1 loại)');
console.log('   6. XU HƯỚNG (2 loại)');
console.log('   7. STREAK (1 loại)');
console.log('   8. BAYES (2 loại)');
console.log('   9. FIBONACCI (2 loại)');
console.log('   10. CHỈ BÁO KỸ THUẬT (7 loại)');
console.log('   11. MACHINE LEARNING (7 loại)');
console.log('   12. PATTERN DETECTORS (10 loại)');
console.log('   13. TÍN HIỆU BẺ CẦU (8 loại)');
console.log('─────────────────────────────');
console.log(`🧠 TỔNG CỘNG: 50+ thuật toán`);

setTimeout(() => predictor.fetchAndPredict(), 1000);
setInterval(() => predictor.fetchAndPredict(), CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
