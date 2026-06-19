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
// PATTERN DATABASE
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
                reason: `Khớp mẫu '${subPattern}' (độ tin cậy ${result.confidence}%)`
            };
        }
    }
    return { matched: false };
}

// ============================================================
// ==================== THUẬT TOÁN MODEL MỚI ====================
// ============================================================

// ==================== 1. MARKOV ====================

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
    return best ? { prediction: best, confidence: Math.round(bestConf) } : null;
}

function markov1(history) {
    if (history.length < 2) return null;
    const last = history[history.length - 1];
    const trans = { T: { T: 0, X: 0 }, X: { T: 0, X: 0 } };
    for (let i = 0; i < history.length - 1; i++) {
        trans[history[i]][history[i + 1]]++;
    }
    if (trans[last].T > trans[last].X) return 'T';
    if (trans[last].X > trans[last].T) return 'X';
    return null;
}

function markov2(history) {
    if (history.length < 3) return null;
    const last2 = history.slice(-2);
    const trans = new Map();
    for (let i = 0; i < history.length - 2; i++) {
        const key = history[i] + ',' + history[i + 1];
        const next = history[i + 2];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last2.join(','));
    if (!possible) return null;
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

function markov3(history) {
    if (history.length < 4) return null;
    const last3 = history.slice(-3);
    const trans = new Map();
    for (let i = 0; i < history.length - 3; i++) {
        const key = history.slice(i, i + 3).join(',');
        const next = history[i + 3];
        if (!trans.has(key)) trans.set(key, { T: 0, X: 0 });
        trans.get(key)[next]++;
    }
    const possible = trans.get(last3.join(','));
    if (!possible) return null;
    return possible.T > possible.X ? 'T' : (possible.X > possible.T ? 'X' : null);
}

// Markov xúc xắc 1-2-3
class MarkovXucXac123 {
    constructor(bac = 3) {
        this.bac = Math.min(4, Math.max(1, bac));
        this.transitions = new Map();
        this.history = [];
        this.maxHistory = 60;
    }

    static chuyenLoai(diem) {
        if (diem === 1 || diem === 2) return 1;
        if (diem === 3 || diem === 4) return 2;
        return 3;
    }

    themDuLieu(daySo) {
        const filtered = daySo.map(x => MarkovXucXac123.chuyenLoai(x));
        this.history.push(...filtered);
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(-this.maxHistory);
        }
        this._xayDungMaTran();
    }

    _xayDungMaTran() {
        this.transitions.clear();
        const len = this.history.length;
        if (len < this.bac + 1) return;
        for (let i = this.bac; i < len; i++) {
            for (let b = 1; b <= this.bac; b++) {
                const state = [];
                for (let j = b - 1; j >= 0; j--) state.push(this.history[i - j]);
                const stateKey = state.join(',');
                const nextVal = this.history[i];
                if (!this.transitions.has(stateKey)) this.transitions.set(stateKey, new Map());
                const nextMap = this.transitions.get(stateKey);
                nextMap.set(nextVal, (nextMap.get(nextVal) || 0) + 1);
            }
        }
    }

    duDoan() {
        if (this.history.length < 2) return this._duDoanTheoXuatHuong();
        const states = this._layStateHienTai();
        const diem = { 1: 0, 2: 0, 3: 0 };
        let tongDiem = 0;
        for (let i = states.length - 1; i >= 0; i--) {
            const nextMap = this.transitions.get(states[i].key);
            if (nextMap && nextMap.size > 0) {
                const heSo = Math.pow(2, states[i].bac);
                for (let [val, count] of nextMap.entries()) {
                    diem[val] += count * heSo;
                    tongDiem += count * heSo;
                }
                break;
            }
        }
        if (tongDiem === 0) return this._duDoanTheoXuatHuong();
        let rand = Math.random() * tongDiem;
        let cum = 0;
        for (let val of [1, 2, 3]) {
            cum += diem[val];
            if (rand <= cum) return val;
        }
        return 2;
    }

    _duDoanTheoXuatHuong() {
        if (this.history.length === 0) return 2;
        const dem = { 1: 0, 2: 0, 3: 0 };
        this.history.forEach(v => dem[v]++);
        let maxVal = 2, maxCount = 0;
        for (let val of [1, 2, 3]) {
            if (dem[val] > maxCount) { maxCount = dem[val]; maxVal = val; }
        }
        return maxVal;
    }

    _layStateHienTai() {
        if (this.history.length < 1) return null;
        const results = [];
        for (let b = 1; b <= this.bac; b++) {
            if (this.history.length >= b) {
                const state = [];
                for (let j = b - 1; j >= 0; j--) state.push(this.history[this.history.length - 1 - j]);
                results.push({ bac: b, key: state.join(',') });
            }
        }
        return results;
    }

    phanTich() {
        const duDoanSo = this.duDoan();
        const prediction = (duDoanSo === 1 || duDoanSo === 3) ? "T" : "X";
        let confidence = 65;
        if (this.history.length > 30) confidence += 10;
        return { prediction, confidence: Math.min(95, confidence) };
    }
}

// ==================== 2. TẦN SUẤT ====================

function predictWeightedFrequency(history, window = 50) {
    const recent = history.slice(-window);
    let wTai = 0, wXiu = 0;
    for (let i = 0; i < recent.length; i++) {
        const w = Math.pow(0.93, recent.length - 1 - i);
        const val = typeof recent[i] === 'string' ? recent[i] : (recent[i].result === "Tài" ? "T" : "X");
        if (val === 'T') wTai += w;
        else wXiu += w;
    }
    if (wTai + wXiu === 0) return null;
    const probTai = wTai / (wTai + wXiu);
    const pred = probTai > 0.5 ? "T" : "X";
    const conf = Math.abs(probTai - 0.5) * 2 * 100;
    return { prediction: pred, confidence: Math.min(95, Math.max(50, conf)) };
}

function simpleMajority(history, window = 15) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const t = recent.filter(r => r === 'T').length;
    const x = window - t;
    if (t > x) return 'T';
    if (x > t) return 'X';
    return null;
}

function cumulativeImbalance(history, window = 25) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const imbalance = recent.filter(r => r === 'T').length - recent.filter(r => r === 'X').length;
    if (imbalance > 7) return 'X';
    if (imbalance < -7) return 'T';
    return null;
}

// ==================== 3. CHU KỲ ====================

function predictCycle(seq, maxCycle = 20) {
    for (let cycle = 3; cycle <= maxCycle; cycle++) {
        if (seq.length < cycle * 2) continue;
        const lastCycle = seq.slice(-cycle);
        let matches = [];
        for (let i = 0; i <= seq.length - cycle - 1; i++) {
            if (seq.slice(i, i + cycle).join('') === lastCycle.join('')) matches.push(i);
        }
        if (matches.length >= 2) {
            const nextIdx = matches[matches.length - 1] + cycle;
            if (nextIdx < seq.length) {
                const nextRes = seq[nextIdx];
                const pred = nextRes === "T" ? "T" : "X";
                let conf = 60 + Math.min(30, matches.length * 3);
                return { prediction: pred, confidence: conf };
            }
        }
    }
    return null;
}

// ==================== 4. XU HƯỚNG ====================

function predictTrend(history) {
    if (history.length < 6) return null;
    const last6 = history.slice(-6);
    const last3 = last6.slice(-3);
    if (last3[0] === last3[1] && last3[1] === last3[2]) {
        return { prediction: last3[0] === "T" ? "X" : "T", confidence: 72 };
    }
    let alt = true;
    for (let i = 1; i < last6.length; i++) if (last6[i] === last6[i - 1]) alt = false;
    if (alt && last6.length >= 4) {
        return { prediction: last6[last6.length - 1] === "T" ? "X" : "T", confidence: 76 };
    }
    if (last6.length >= 5 && last6[0] === last6[1] && last6[2] === last6[3] && last6[1] !== last6[2]) {
        return { prediction: last6[3] === "T" ? "X" : "T", confidence: 68 };
    }
    const t = last6.filter(r => r === "T").length;
    const x = 6 - t;
    if (t !== x) {
        const pred = t > x ? "T" : "X";
        const conf = 55 + Math.abs(t - x) * 3;
        return { prediction: pred, confidence: Math.min(75, conf) };
    }
    return null;
}

function movingAverageCross(history, short = 5, long = 13) {
    if (history.length < long) return null;
    const shortT = history.slice(-short).filter(r => r === 'T').length / short;
    const longT = history.slice(-long).filter(r => r === 'T').length / long;
    if (shortT > longT + 0.12) return 'T';
    if (longT > shortT + 0.12) return 'X';
    return null;
}

// ==================== 5. STREAK ====================

function predictStreak(history) {
    if (history.length < 5) return null;
    let streakLen = 1;
    for (let i = history.length - 2; i >= 0; i--) {
        if (history[i] === history[history.length - 1]) streakLen++;
        else break;
    }
    if (streakLen >= 3) {
        const pred = history[history.length - 1] === "T" ? "X" : "T";
        let conf = 60 + Math.min(25, streakLen * 4);
        return { prediction: pred, confidence: Math.min(85, conf) };
    }
    if (streakLen <= 2) {
        const pred = history[history.length - 1];
        let conf = 55 + streakLen * 5;
        return { prediction: pred, confidence: Math.min(75, conf) };
    }
    return null;
}

// ==================== 6. BAYES ====================

function predictBayes(history) {
    if (history.length < 10) return null;
    const seq = history.join('');
    const last3 = seq.slice(-3);
    let tCount = 0, xCount = 0;
    for (let i = 0; i <= seq.length - 4; i++) {
        const pattern = seq.slice(i, i + 3);
        if (pattern === last3) {
            const next = seq[i + 3];
            if (next === 'T') tCount++;
            else xCount++;
        }
    }
    if (tCount + xCount < 3) return null;
    const pred = tCount > xCount ? "T" : "X";
    const conf = 55 + Math.min(30, Math.abs(tCount - xCount) * 4);
    return { prediction: pred, confidence: Math.min(90, conf) };
}

function naiveBayes(history, window = 15) {
    if (history.length < window) return null;
    const p_t = history.filter(r => r === 'T').length / history.length;
    const p_x = 1 - p_t;
    const last5 = history.slice(-5);
    let cond_t = 0, cond_x = 0;
    let tCount = 0, xCount = 0;
    for (let i = 0; i < history.length - 5; i++) {
        if (history.slice(i, i + 5).join('') === last5.join('')) {
            const next = history[i + 5];
            if (next === 'T') { cond_t++; tCount++; }
            else { cond_x++; xCount++; }
        }
    }
    cond_t = cond_t / Math.max(1, tCount);
    cond_x = cond_x / Math.max(1, xCount);
    const post_t = p_t * cond_t;
    const post_x = p_x * cond_x;
    return post_t > post_x ? 'T' : 'X';
}

// ==================== 7. FIBONACCI ====================

function predictFibonacci(history) {
    if (history.length < 12) return null;
    const totals = history.slice(-12);
    const diffs = [];
    for (let i = 1; i < totals.length; i++) diffs.push(totals[i] - totals[i - 1]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    let nextTotal = totals[totals.length - 1] + avgDiff;
    nextTotal = Math.min(18, Math.max(3, Math.round(nextTotal)));
    const pred = nextTotal > 10 ? "T" : "X";
    const conf = 55 + Math.min(30, Math.abs(avgDiff) * 2.5);
    return { prediction: pred, confidence: Math.min(85, conf) };
}

function fibonacciFractal(history) {
    const fibs = [1, 1, 2, 3, 5, 8, 13];
    let countMatch = 0;
    for (let f of fibs) {
        if (history.length > f && history[history.length - f] === history[history.length - 1]) countMatch++;
    }
    if (countMatch >= Math.floor(fibs.length / 2)) return history[history.length - 1];
    return history[history.length - 1] === 'T' ? 'X' : 'T';
}

// ==================== 8. CHỈ BÁO KỸ THUẬT ====================

function rsiPredict(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
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
    if (rsi > 75) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (rsi < 25) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (rsi > 65) return 'X';
    if (rsi < 35) return 'T';
    return null;
}

function bollingerPredict(history, period = 12) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const variance = nums.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const last = nums[nums.length - 1];
    if (last > upper) return 'X';
    if (last < lower) return 'T';
    return null;
}

function macdPredict(history, short = 6, long = 13, signal = 4) {
    if (history.length < long + signal) return null;
    const nums = history.map(c => c === 'T' ? 1 : 0);
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
    if (macd > signalLine + 0.05) return 'T';
    if (macd < signalLine - 0.05) return 'X';
    return null;
}

function stochasticPredict(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const k = (nums[nums.length - 1] - lowest) / (highest - lowest) * 100;
    if (k > 80) return 'X';
    if (k < 20) return 'T';
    return null;
}

function williamsR(history, period = 7) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const highest = Math.max(...nums);
    const lowest = Math.min(...nums);
    if (highest === lowest) return null;
    const wr = (highest - nums[nums.length - 1]) / (highest - lowest) * -100;
    if (wr < -80) return 'T';
    if (wr > -20) return 'X';
    return null;
}

function cciPredict(history, period = 10) {
    if (history.length < period) return null;
    const nums = history.slice(-period).map(c => c === 'T' ? 1 : 0);
    const mean = nums.reduce((a, b) => a + b, 0) / period;
    const mad = nums.reduce((sum, x) => sum + Math.abs(x - mean), 0) / period;
    if (mad === 0) return null;
    const cci = (nums[nums.length - 1] - mean) / (0.015 * mad);
    if (cci > 100) return 'X';
    if (cci < -100) return 'T';
    return null;
}

function entropyPrediction(history, window = 12) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const p_t = recent.filter(r => r === 'T').length / window;
    if (p_t === 0 || p_t === 1) return recent[recent.length - 1];
    const entropy = -p_t * Math.log2(p_t) - (1 - p_t) * Math.log2(1 - p_t);
    if (entropy > 0.95) return recent[recent.length - 1] === 'T' ? 'X' : 'T';
    return recent[recent.length - 1];
}

// ==================== 9. MACHINE LEARNING ====================

function linearRegression(history, window = 12) {
    if (history.length < window) return null;
    const y = history.slice(-window).map(c => c === 'T' ? 1 : 0);
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
    return pred > 0.5 ? 'T' : 'X';
}

function knnPredict(history, k = 5, lookback = 10) {
    if (history.length < lookback + k) return null;
    const query = history.slice(-lookback);
    const distances = [];
    for (let i = 0; i < history.length - lookback - 1; i++) {
        const segment = history.slice(i, i + lookback);
        let distance = 0;
        for (let j = 0; j < lookback; j++) if (segment[j] !== query[j]) distance++;
        distances.push({ distance, next: history[i + lookback] });
    }
    distances.sort((a, b) => a.distance - b.distance);
    const neighbors = distances.slice(0, k).map(d => d.next);
    const tCount = neighbors.filter(n => n === 'T').length;
    return tCount > k - tCount ? 'T' : 'X';
}

function decisionTree(history) {
    if (history.length < 10) return null;
    const last1 = history[history.length - 1];
    const last2 = history.length > 1 ? history[history.length - 2] : null;
    const last3 = history.length > 2 ? history[history.length - 3] : null;
    const t5 = history.slice(-5).filter(c => c === 'T').length;
    if (last1 === 'T' && last2 === 'T' && last3 === 'T') return 'X';
    if (last1 === 'X' && last2 === 'X' && last3 === 'X') return 'T';
    if (last1 === 'T' && last2 === 'X' && last3 === 'T') return 'X';
    if (last1 === 'X' && last2 === 'T' && last3 === 'X') return 'T';
    if (t5 >= 4) return 'X';
    if (t5 <= 1) return 'T';
    return last1;
}

function meanReversion(history, window = 12) {
    if (history.length < window) return null;
    const recent = history.slice(-window);
    const mean = recent.filter(r => r === 'T').length / window;
    if (mean > 0.75) return 'X';
    if (mean < 0.25) return 'T';
    return null;
}

function patternMatching(history, lookback = 25) {
    if (history.length < lookback) return null;
    const query = history.slice(-lookback);
    let bestMatch = -1, bestScore = -1;
    for (let i = 0; i < history.length - lookback; i++) {
        const segment = history.slice(i, i + lookback);
        let score = 0;
        for (let j = 0; j < lookback; j++) if (segment[j] === query[j]) score++;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = i;
        }
    }
    if (bestMatch !== -1 && bestMatch + lookback < history.length) {
        return history[bestMatch + lookback];
    }
    return null;
}

function zigzagPredict(history) {
    if (history.length < 5) return null;
    let changes = 0;
    for (let i = 1; i < Math.min(5, history.length); i++) {
        if (history[history.length - i] !== history[history.length - i - 1]) changes++;
    }
    if (changes >= 4) return history[history.length - 1] === 'T' ? 'X' : 'T';
    if (changes >= 3) return history[history.length - 1];
    return null;
}

// ==================== 10. PATTERN DETECTORS ====================

const PatternDetectors = {
    detect_1_1: (history) => {
        if (history.length >= 4 && history.slice(-4).join('') === "TXTX") return { pred: 'X', conf: 88, name: "Cầu 1-1" };
        if (history.length >= 4 && history.slice(-4).join('') === "XTXT") return { pred: 'T', conf: 88, name: "Cầu 1-1" };
        return null;
    },
    detect_2_2: (history) => {
        if (history.length >= 4 && history.slice(-4).join('') === "TTXX") return { pred: 'X', conf: 82, name: "Cầu 2-2" };
        if (history.length >= 4 && history.slice(-4).join('') === "XXTT") return { pred: 'T', conf: 82, name: "Cầu 2-2" };
        return null;
    },
    detect_3_3: (history) => {
        if (history.length >= 6 && history.slice(-6).join('') === "TTTXXX") return { pred: 'X', conf: 78, name: "Cầu 3-3" };
        if (history.length >= 6 && history.slice(-6).join('') === "XXXTTT") return { pred: 'T', conf: 78, name: "Cầu 3-3" };
        return null;
    },
    detect_1_2_3: (history) => {
        if (history.length >= 6 && history.slice(-6).join('') === "TXXTTT") return { pred: 'X', conf: 77, name: "Cầu 1-2-3" };
        if (history.length >= 6 && history.slice(-6).join('') === "XTTXXX") return { pred: 'T', conf: 77, name: "Cầu 1-2-3" };
        return null;
    },
    detect_triangle: (history) => {
        const last5 = history.slice(-5).join('');
        if (last5 === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu tam giác" };
        if (last5 === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu tam giác" };
        return null;
    },
    detect_zigzag: (history) => {
        if (history.length >= 5 && history.slice(-5).join('') === "TXTXT") return { pred: 'X', conf: 80, name: "Cầu Zigzag 5" };
        if (history.length >= 5 && history.slice(-5).join('') === "XTXTX") return { pred: 'T', conf: 80, name: "Cầu Zigzag 5" };
        if (history.length >= 7 && history.slice(-7).join('') === "TXTXTXT") return { pred: 'X', conf: 84, name: "Cầu Zigzag 7" };
        if (history.length >= 7 && history.slice(-7).join('') === "XTXTXTX") return { pred: 'T', conf: 84, name: "Cầu Zigzag 7" };
        return null;
    },
    detect_dragon: (history) => {
        let tRun = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i] === 'T') tRun++;
            else break;
        }
        if (tRun >= 6) return { pred: 'X', conf: 82, name: `Cầu Rồng ${tRun}` };
        if (tRun >= 4) return { pred: 'T', conf: 72, name: `Cầu Rồng ${tRun}` };
        return null;
    },
    detect_tiger: (history) => {
        let xRun = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i] === 'X') xRun++;
            else break;
        }
        if (xRun >= 6) return { pred: 'T', conf: 82, name: `Cầu Hổ ${xRun}` };
        if (xRun >= 4) return { pred: 'X', conf: 72, name: `Cầu Hổ ${xRun}` };
        return null;
    },
    detect_4_4: (history) => {
        if (history.length >= 8 && history.slice(-8).join('') === "TTTTXXXX") return { pred: 'X', conf: 79, name: "Cầu 4-4" };
        if (history.length >= 8 && history.slice(-8).join('') === "XXXXTTTT") return { pred: 'T', conf: 79, name: "Cầu 4-4" };
        return null;
    },
    detect_5_5: (history) => {
        if (history.length >= 10 && history.slice(-10).join('') === "TTTTTXXXXX") return { pred: 'X', conf: 77, name: "Cầu 5-5" };
        if (history.length >= 10 && history.slice(-10).join('') === "XXXXXTTTTT") return { pred: 'T', conf: 77, name: "Cầu 5-5" };
        return null;
    }
};

// ==================== 11. TÍN HIỆU BẺ CẦU ====================

const BreakSignalDetectors = [
    (history) => { const pred = rsiPredict(history, 7); return pred && pred !== history[history.length - 1]; },
    (history) => { const pred = bollingerPredict(history, 10); return pred && pred !== history[history.length - 1]; },
    (history) => { const pred = macdPredict(history, 5, 12, 3); return pred && pred !== history[history.length - 1]; },
    (history) => { const pred = stochasticPredict(history, 7); return pred && pred !== history[history.length - 1]; },
    (history) => { const pred = williamsR(history, 7); return pred && pred !== history[history.length - 1]; },
    (history) => { const pred = cciPredict(history, 10); return pred && pred !== history[history.length - 1]; },
    (history) => {
        if (history.length < 10) return false;
        const nums = history.slice(-10).map(c => c === 'T' ? 1 : 0);
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
    (history) => {
        if (history.length < 10) return false;
        let changes = 0;
        for (let i = 1; i < Math.min(10, history.length); i++) {
            if (history[history.length - i] !== history[history.length - i - 1]) changes++;
        }
        return changes >= 7;
    }
];

function countBreakSignals(history) {
    let count = 0;
    for (let detector of BreakSignalDetectors) {
        if (detector(history)) count++;
    }
    return count;
}

// ==================== 12. KẾT HỢP TỔNG THỂ ====================

function combinedPredict(history) {
    if (history.length < 10) return { prediction: "Chưa đủ dữ liệu", confidence: 0 };
    
    const historyArray = history.map(item => {
        if (typeof item === 'string') return item;
        const result = item.result || item.Ket_qua || item.ket_qua;
        return (result === "Tài" || result === "T") ? "T" : "X";
    });
    
    const predictions = [];
    
    // Markov
    const markovResult = predictMarkov(historyArray);
    if (markovResult) predictions.push({ pred: markovResult.prediction, weight: 0.15, conf: markovResult.confidence / 100 });
    
    // Tần suất
    const freqResult = predictWeightedFrequency(historyArray);
    if (freqResult) predictions.push({ pred: freqResult.prediction, weight: 0.13, conf: freqResult.confidence / 100 });
    
    // Chu kỳ
    const cycleResult = predictCycle(historyArray);
    if (cycleResult) predictions.push({ pred: cycleResult.prediction, weight: 0.12, conf: cycleResult.confidence / 100 });
    
    // Xu hướng
    const trendResult = predictTrend(historyArray);
    if (trendResult) predictions.push({ pred: trendResult.prediction, weight: 0.12, conf: trendResult.confidence / 100 });
    
    // Fibonacci
    const fibResult = predictFibonacci(historyArray);
    if (fibResult) predictions.push({ pred: fibResult.prediction, weight: 0.10, conf: fibResult.confidence / 100 });
    
    // Streak
    const streakResult = predictStreak(historyArray);
    if (streakResult) predictions.push({ pred: streakResult.prediction, weight: 0.10, conf: streakResult.confidence / 100 });
    
    // Bayes
    const bayesResult = predictBayes(historyArray);
    if (bayesResult) predictions.push({ pred: bayesResult.prediction, weight: 0.10, conf: bayesResult.confidence / 100 });
    
    // Pattern detectors
    for (const [name, detector] of Object.entries(PatternDetectors)) {
        const result = detector(historyArray);
        if (result) predictions.push({ pred: result.pred, weight: 0.08, conf: result.conf / 100, pattern: name });
    }
    
    // Technical indicators
    const rsi = rsiPredict(historyArray);
    if (rsi) predictions.push({ pred: rsi, weight: 0.08, conf: 0.7 });
    
    const macd = macdPredict(historyArray);
    if (macd) predictions.push({ pred: macd, weight: 0.08, conf: 0.68 });
    
    const knn = knnPredict(historyArray);
    if (knn) predictions.push({ pred: knn, weight: 0.08, conf: 0.65 });
    
    const nb = naiveBayes(historyArray);
    if (nb) predictions.push({ pred: nb, weight: 0.08, conf: 0.66 });
    
    const dt = decisionTree(historyArray);
    if (dt) predictions.push({ pred: dt, weight: 0.08, conf: 0.67 });
    
    const lr = linearRegression(historyArray);
    if (lr) predictions.push({ pred: lr, weight: 0.08, conf: 0.63 });
    
    const mr = meanReversion(historyArray);
    if (mr) predictions.push({ pred: mr, weight: 0.08, conf: 0.64 });
    
    const pm = patternMatching(historyArray);
    if (pm) predictions.push({ pred: pm, weight: 0.08, conf: 0.62 });
    
    // Tính điểm
    let scoreT = 0, scoreX = 0, totalWeight = 0;
    for (const p of predictions) {
        const weightedConf = p.weight * p.conf;
        if (p.pred === 'T') scoreT += weightedConf;
        else scoreX += weightedConf;
        totalWeight += p.weight;
    }
    
    // Xử lý tín hiệu bẻ cầu
    const breakCount = countBreakSignals(historyArray);
    let finalPred = scoreT > scoreX ? "T" : "X";
    if (breakCount >= 3) {
        finalPred = finalPred === "T" ? "X" : "T";
    }
    
    let confidence = totalWeight > 0 ? Math.round((Math.max(scoreT, scoreX) / totalWeight) * 100) : 50;
    confidence = Math.min(99, Math.max(50, confidence + breakCount * 2));
    
    return {
        prediction: finalPred === "T" ? "Tài" : "Xỉu",
        confidence: confidence,
        breakSignals: breakCount,
        totalAlgorithms: predictions.length
    };
}

// ============================================================
// HÀM DU_DOAN_JS - CẢI TIẾN VỚI TẤT CẢ THUẬT TOÁN
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

        // ===== KIỂM TRA TỔNG HỢP THUẬT TOÁN =====
        const combined = combinedPredict(data_kq);
        if (combined && combined.prediction !== "Chưa đủ dữ liệu") {
            const pred = combined.prediction === "Tài" ? "T" : "X";
            const score = combined.confidence;
            return {
                pred: pred,
                score: Math.min(score, 99),
                reason: `🧠 Tổng hợp ${combined.totalAlgorithms} thuật toán (bẻ cầu: ${combined.breakSignals})`
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
// CÁC CLASS CŨ (MARKOV, RUN_LENGTH, MOMENTUM, PATTERN)
// ============================================================
class MarkovModel {
    constructor(order = CONFIG.MARKOV_ORDER) {
        this.order = order;
        this.table = {};
    }
    train(seq) {
        this.table = {};
        for (let i = 0; i + this.order < seq.length; i++) {
            const ctx = seq.slice(i, i + this.order).join('');
            const next = seq[i + this.order];
            if (!this.table[ctx]) this.table[ctx] = { T: 0, X: 0 };
            this.table[ctx][next] += 1;
        }
    }
    predictProba(seq) {
        if (seq.length < this.order) {
            const c = counts(seq);
            const tot = (c.T + c.X) || 1;
            return { T: c.T / tot, X: c.X / tot };
        }
        const ctx = seq.slice(seq.length - this.order).join('');
        const entry = this.table[ctx];
        if (!entry) {
            if (this.order > 1) {
                const sub = new MarkovModel(this.order - 1);
                sub.table = this.table;
                return sub.predictProba(seq);
            } else {
                const c = counts(seq);
                const tot = (c.T + c.X) || 1;
                return { T: c.T / tot, X: c.X / tot };
            }
        }
        const tot = entry.T + entry.X || 1;
        return { T: entry.T / tot, X: entry.X / tot };
    }
}

class RunLengthModel {
    predictProba(seq) {
        if (!seq.length) return { T: 0.5, X: 0.5 };
        const { value, run } = computeRunLength(seq);
        const shortThreshold = CONFIG.RUN_WINDOW_SHORT;
        const longThreshold = CONFIG.RUN_WINDOW_LONG;
        let contProb = 0.6 * Math.exp(-run / (shortThreshold)) + 0.3 * Math.exp(-run / (longThreshold));
        contProb = clamp(contProb, 0.05, 0.95);
        const res = { T: 0.5, X: 0.5 };
        if (value === 'T') { res.T = contProb; res.X = 1 - contProb; }
        else { res.X = contProb; res.T = 1 - contProb; }
        return res;
    }
}

class MomentumModel {
    predictProba(seq) {
        const nShort = 5, nMid = 15;
        const s1 = last(seq, nShort);
        const s2 = last(seq, nMid);
        const c1 = counts(s1), c2 = counts(s2);
        const scoreShort = (c1.T - c1.X) / (nShort || 1);
        const scoreMid = (c2.T - c2.X) / (nMid || 1);
        let momentum = 0.7 * scoreShort + 0.3 * scoreMid;
        const shift = clamp(momentum * 0.4, -0.4, 0.4);
        const pT = clamp(0.5 + shift, 0.02, 0.98);
        return { T: pT, X: 1 - pT };
    }
}

class PatternModel {
    detectPattern(seq) {
        if (seq.length >= 6) {
            const tail = last(seq, 6).join('');
            if (/^([TX])([TX])\1\2\1\2$/.test(tail)) return { type: 'zigzag', strength: 0.9 };
        }
        const { value, run } = computeRunLength(seq);
        if (run >= 4) return { type: 'streak', strength: clamp((run - 3) / 10, 0.2, 0.9) };
        if (seq.length >= 8) {
            const tail = last(seq, 8).join('');
            if (/^(T{2}X{2})+|^(X{2}T{2})+/.test(tail)) return { type: 'twin', strength: 0.85 };
        }
        return { type: 'none', strength: 0.0 };
    }
    predictProba(seq) {
        const p = { T: 0.5, X: 0.5 };
        const detected = this.detectPattern(seq);
        if (detected.type === 'zigzag') {
            const lastVal = seq[seq.length - 1];
            p[lastVal === 'T' ? 'X' : 'T'] = 0.6 * detected.strength + 0.4;
            p[lastVal] = 1 - p[lastVal === 'T' ? 'X' : 'T'];
        } else if (detected.type === 'streak') {
            const lastVal = seq[seq.length - 1];
            p[lastVal] = 0.55 * detected.strength + 0.45;
            p[lastVal === 'T' ? 'X' : 'T'] = 1 - p[lastVal];
        } else if (detected.type === 'twin') {
            const lastVal = seq[seq.length - 1];
            p[lastVal === 'T' ? 'X' : 'T'] = 0.62 * detected.strength + 0.38;
            p[lastVal] = 1 - p[lastVal === 'T' ? 'X' : 'T'];
        }
        return p;
    }
}

class Ensemble {
    constructor() {
        this.weights = {};
        CONFIG.MODELS.forEach(m => this.weights[m] = 1 / CONFIG.MODELS.length);
        this.perfEMA = {};
        CONFIG.MODELS.forEach(m => this.perfEMA[m] = 0.5);
        this.models = {
            markov: new MarkovModel(CONFIG.MARKOV_ORDER),
            run_length: new RunLengthModel(),
            momentum: new MomentumModel(),
            pattern: new PatternModel(),
        };
    }
    trainAll(seq) {
        this.models.markov.train(seq);
    }
    predictProba(seq) {
        const modelProbas = {};
        CONFIG.MODELS.forEach(m => { modelProbas[m] = this.models[m].predictProba(seq); });
        const mix = { T: 0, X: 0 };
        CONFIG.MODELS.forEach(m => {
            const w = this.weights[m] || 0;
            mix.T += w * modelProbas[m].T;
            mix.X += w * modelProbas[m].X;
        });
        const tot = mix.T + mix.X || 1;
        mix.T /= tot;
        mix.X /= tot;
        return { distribution: mix, modelProbas, weights: { ...this.weights } };
    }
    updateWeights(seqBefore, actual) {
        CONFIG.MODELS.forEach(m => {
            const p = this.models[m].predictProba(seqBefore)[actual];
            const score = clamp(p, 0.001, 0.999);
            const old = this.perfEMA[m] || 0.5;
            const alpha = 0.08;
            this.perfEMA[m] = old * (1 - alpha) + alpha * score;
        });
        const raw = {};
        let sumRaw = 0;
        CONFIG.MODELS.forEach(m => { raw[m] = Math.pow(this.perfEMA[m], 3);
            sumRaw += raw[m]; });
        const newWeights = {};
        CONFIG.MODELS.forEach(m => {
            const target = sumRaw ? raw[m] / sumRaw : 1 / CONFIG.MODELS.length;
            newWeights[m] = clamp(this.weights[m] * (1 - 0.05) + target * 0.05, 0.0001, 0.9999);
        });
        const sumNew = Object.values(newWeights).reduce((a, b) => a + b, 0) || 1;
        CONFIG.MODELS.forEach(m => this.weights[m] = newWeights[m] / sumNew);
    }
}

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

app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'API Predictor is running',
        time: new Date().toISOString(),
        keepAlive: keepAliveCount
    });
});

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
console.log('🧠 Combined algorithms: 25+ algorithms');

setTimeout(fetchAndPredict, 1000);
setInterval(fetchAndPredict, CONFIG.POLL_INTERVAL);

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
    console.log(`💓 Keep-alive will ping every 5 minutes`);
});

process.stdin.resume();
