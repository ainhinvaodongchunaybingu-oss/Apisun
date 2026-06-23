// ============================================================
// DU_DOAN.JS - MODULE DỰ ĐOÁN TỔNG HỢP (50+ THUẬT TOÁN)
// Tác giả: @bucactaodi
// Phiên bản: 3.0 - GỘP TẤT CẢ THÀNH 1 MODULE DUY NHẤT
// ============================================================

(function() {
    'use strict';

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
                best = probTai > 0.5 ? "Tài" : probTai < 0.5 ? "Xỉu" : (Math.random() < 0.5 ? "Tài" : "Xỉu");
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

    // ==================== 2. TẦN SUẤT ====================
    function predictWeightedFrequency(history, window = 50) {
        const recent = history.slice(-window);
        let wTai = 0, wXiu = 0;
        for (let i = 0; i < recent.length; i++) {
            const w = Math.pow(0.93, recent.length - 1 - i);
            if (recent[i] === "Tài") wTai += w;
            else wXiu += w;
        }
        if (wTai + wXiu === 0) return null;
        const probTai = wTai / (wTai + wXiu);
        const pred = probTai > 0.5 ? "Tài" : "Xỉu";
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
                if (seq.slice(i, i + cycle) === lastCycle) matches.push(i);
            }
            if (matches.length >= 2) {
                const nextIdx = matches[matches.length - 1] + cycle;
                if (nextIdx < seq.length) {
                    const nextRes = seq[nextIdx];
                    const pred = nextRes === "T" ? "Tài" : "Xỉu";
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
            return { prediction: last3[0] === "Tài" ? "Xỉu" : "Tài", confidence: 72 };
        }
        let alt = true;
        for (let i = 1; i < last6.length; i++) if (last6[i] === last6[i - 1]) alt = false;
        if (alt && last6.length >= 4) {
            return { prediction: last6[last6.length - 1] === "Tài" ? "Xỉu" : "Tài", confidence: 76 };
        }
        if (last6.length >= 5 && last6[0] === last6[1] && last6[2] === last6[3] && last6[1] !== last6[2]) {
            return { prediction: last6[3] === "Tài" ? "Xỉu" : "Tài", confidence: 68 };
        }
        const tai = last6.filter(r => r === "Tài").length;
        const xiu = 6 - tai;
        if (tai !== xiu) {
            const pred = tai > xiu ? "Tài" : "Xỉu";
            const conf = 55 + Math.abs(tai - xiu) * 3;
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
        const last = history[history.length - 1];
        for (let i = history.length - 2; i >= 0; i--) {
            if (history[i] === last) streakLen++;
            else break;
        }
        if (streakLen >= 3) {
            const pred = last === "Tài" ? "Xỉu" : "Tài";
            let conf = 60 + Math.min(25, streakLen * 4);
            return { prediction: pred, confidence: Math.min(85, conf) };
        }
        if (streakLen <= 2) {
            const pred = last;
            let conf = 55 + streakLen * 5;
            return { prediction: pred, confidence: Math.min(75, conf) };
        }
        return null;
    }

    // ==================== 6. BAYES ====================
    function predictBayes(history) {
        if (history.length < 10) return null;
        const seq = history.map(h => h === "Tài" ? "T" : "X").join('');
        const last3 = seq.slice(-3);
        let taiCount = 0, xiuCount = 0;
        for (let i = 0; i <= seq.length - 4; i++) {
            const pattern = seq.slice(i, i + 3);
            if (pattern === last3) {
                const next = seq[i + 3];
                if (next === 'T') taiCount++;
                else xiuCount++;
            }
        }
        if (taiCount + xiuCount < 3) return null;
        const pred = taiCount > xiuCount ? "Tài" : "Xỉu";
        const conf = 55 + Math.min(30, Math.abs(taiCount - xiuCount) * 4);
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
    function predictFibonacciByTotal(history) {
        if (history.length < 12) return null;
        const totals = history.slice(-12).map(h => h.total || 0);
        const diffs = [];
        for (let i = 1; i < totals.length; i++) diffs.push(totals[i] - totals[i - 1]);
        const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        let nextTotal = totals[totals.length - 1] + avgDiff;
        nextTotal = Math.min(18, Math.max(3, Math.round(nextTotal)));
        const pred = nextTotal > 10 ? "Tài" : "Xỉu";
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

    // ==================== 8. CẶP XÚC XẮC ====================
    function predictPair(history) {
        if (history.length < 15) return null;
        const recent = history.slice(-15);
        const last = history[history.length - 1];
        const lastPairs = {
            p12: `${last.dice[0]},${last.dice[1]}`,
            p23: `${last.dice[1]},${last.dice[2]}`,
            p13: `${last.dice[0]},${last.dice[2]}`
        };
        let tai = 0, xiu = 0;
        for (const item of recent) {
            const p12 = `${item.dice[0]},${item.dice[1]}`;
            const p23 = `${item.dice[1]},${item.dice[2]}`;
            const p13 = `${item.dice[0]},${item.dice[2]}`;
            if (p12 === lastPairs.p12 || p23 === lastPairs.p23 || p13 === lastPairs.p13) {
                if (item.result === "Tài") tai++;
                else xiu++;
            }
        }
        if (tai + xiu < 4) return null;
        const pred = tai > xiu ? "Tài" : "Xỉu";
        const conf = 55 + Math.min(30, Math.abs(tai - xiu) * 2);
        return { prediction: pred, confidence: Math.min(85, conf) };
    }

    // ==================== 9. CHỈ BÁO KỸ THUẬT ====================
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

    // ==================== 10. MACHINE LEARNING ====================
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

    // ==================== 11. PATTERN CẦU ĐẶC BIỆT ====================
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

    // ==================== 12. TÍN HIỆU BẺ CẦU ====================
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

    // ==================== 13. HÀM CHÍNH - KẾT HỢP TỔNG THỂ ====================
    function getResultSequence(history) {
        return history.map(item => {
            const result = item.result || item;
            return (result === "Tài" || result === "T") ? "T" : "X";
        }).join('');
    }

    /**
     * HÀM DỰ ĐOÁN TỔNG HỢP DUY NHẤT
     * @param {Array} history - Lịch sử kết quả [{ result, dice, total }, ...]
     * @returns {Object} { prediction: "Tài"|"Xỉu", confidence: 0-99, details: {...} }
     */
    function combinedPredict(history) {
        if (!history || history.length < 10) {
            return { 
                prediction: "Chưa đủ dữ liệu", 
                confidence: 0,
                details: { totalAlgorithms: 0, breakSignals: 0 }
            };
        }
        
        const seq = getResultSequence(history);
        const historyArray = history.map(item => {
            const result = item.result || item;
            return (result === "Tài" || result === "T") ? "T" : "X";
        });
        
        // ===== THU THẬP DỰ ĐOÁN TỪ TẤT CẢ THUẬT TOÁN =====
        const predictions = [];
        const usedAlgorithms = [];
        
        // 1. Markov
        const markovResult = predictMarkov(seq);
        if (markovResult) {
            predictions.push({ pred: markovResult.prediction === "Tài" ? "T" : "X", weight: 0.15, conf: markovResult.confidence / 100 });
            usedAlgorithms.push("Markov đa bậc");
        }
        
        // 2. Tần suất trọng số
        const freqResult = predictWeightedFrequency(historyArray);
        if (freqResult) {
            predictions.push({ pred: freqResult.prediction === "Tài" ? "T" : "X", weight: 0.15, conf: freqResult.confidence / 100 });
            usedAlgorithms.push("Tần suất trọng số");
        }
        
        // 3. Chu kỳ
        const cycleResult = predictCycle(seq);
        if (cycleResult) {
            predictions.push({ pred: cycleResult.prediction === "Tài" ? "T" : "X", weight: 0.12, conf: cycleResult.confidence / 100 });
            usedAlgorithms.push("Chu kỳ");
        }
        
        // 4. Xu hướng
        const trendResult = predictTrend(historyArray);
        if (trendResult) {
            predictions.push({ pred: trendResult.prediction === "Tài" ? "T" : "X", weight: 0.12, conf: trendResult.confidence / 100 });
            usedAlgorithms.push("Xu hướng");
        }
        
        // 5. Fibonacci
        const fibResult = predictFibonacciByTotal(history);
        if (fibResult) {
            predictions.push({ pred: fibResult.prediction === "Tài" ? "T" : "X", weight: 0.10, conf: fibResult.confidence / 100 });
            usedAlgorithms.push("Fibonacci");
        }
        
        // 6. Cặp xúc xắc
        const pairResult = predictPair(history);
        if (pairResult) {
            predictions.push({ pred: pairResult.prediction === "Tài" ? "T" : "X", weight: 0.10, conf: pairResult.confidence / 100 });
            usedAlgorithms.push("Cặp xúc xắc");
        }
        
        // 7. Streak (bệt)
        const streakResult = predictStreak(historyArray);
        if (streakResult) {
            predictions.push({ pred: streakResult.prediction === "Tài" ? "T" : "X", weight: 0.10, conf: streakResult.confidence / 100 });
            usedAlgorithms.push("Streak");
        }
        
        // 8. Bayes
        const bayesResult = predictBayes(history);
        if (bayesResult) {
            predictions.push({ pred: bayesResult.prediction === "Tài" ? "T" : "X", weight: 0.10, conf: bayesResult.confidence / 100 });
            usedAlgorithms.push("Bayes");
        }
        
        // 9. Pattern detectors
        for (const [name, detector] of Object.entries(PatternDetectors)) {
            const result = detector(historyArray);
            if (result) {
                predictions.push({ pred: result.pred, weight: 0.08, conf: result.conf / 100 });
                usedAlgorithms.push(result.name || name);
            }
        }
        
        // 10. Technical indicators + ML
        const techs = [
            { name: "RSI", fn: rsiPredict, weight: 0.08, conf: 0.7 },
            { name: "MACD", fn: macdPredict, weight: 0.08, conf: 0.68 },
            { name: "KNN", fn: knnPredict, weight: 0.07, conf: 0.65 },
            { name: "Naive Bayes", fn: naiveBayes, weight: 0.07, conf: 0.66 },
            { name: "Decision Tree", fn: decisionTree, weight: 0.07, conf: 0.67 },
            { name: "Mean Reversion", fn: meanReversion, weight: 0.07, conf: 0.64 },
            { name: "Pattern Matching", fn: patternMatching, weight: 0.06, conf: 0.62 },
            { name: "Zigzag", fn: zigzagPredict, weight: 0.06, conf: 0.60 },
            { name: "Linear Regression", fn: linearRegression, weight: 0.06, conf: 0.61 },
            { name: "Entropy", fn: entropyPrediction, weight: 0.06, conf: 0.59 },
            { name: "Simple Majority", fn: simpleMajority, weight: 0.05, conf: 0.58 },
            { name: "Cumulative Imbalance", fn: cumulativeImbalance, weight: 0.05, conf: 0.57 },
            { name: "Moving Average Cross", fn: movingAverageCross, weight: 0.05, conf: 0.56 },
            { name: "Fibonacci Fractal", fn: fibonacciFractal, weight: 0.05, conf: 0.55 }
        ];
        
        for (const tech of techs) {
            const pred = tech.fn(historyArray);
            if (pred) {
                predictions.push({ pred: pred, weight: tech.weight, conf: tech.conf });
                usedAlgorithms.push(tech.name);
            }
        }
        
        // ===== TÍNH ĐIỂM =====
        let scoreT = 0, scoreX = 0, totalWeight = 0;
        for (const p of predictions) {
            const weightedConf = p.weight * p.conf;
            if (p.pred === 'T') scoreT += weightedConf;
            else scoreX += weightedConf;
            totalWeight += p.weight;
        }
        
        // ===== XỬ LÝ TÍN HIỆU BẺ CẦU =====
        const breakCount = countBreakSignals(historyArray);
        let finalPred = scoreT > scoreX ? "T" : "X";
        let breakMessage = "";
        if (breakCount >= 3) {
            finalPred = finalPred === "T" ? "X" : "T";
            breakMessage = `🔄 Bẻ cầu (${breakCount} tín hiệu)`;
        }
        
        // ===== TÍNH ĐỘ TIN CẬY =====
        let confidence = totalWeight > 0 ? Math.round((Math.max(scoreT, scoreX) / totalWeight) * 100) : 50;
        confidence = Math.min(99, Math.max(50, confidence + breakCount * 2));
        
        // ===== TẠO REASON CHI TIẾT =====
        const predLabel = finalPred === "T" ? "Tài" : "Xỉu";
        let reason = `🧠 Tổng hợp ${predictions.length}/${usedAlgorithms.length} thuật toán`;
        if (breakCount >= 3) reason += ` | ${breakMessage}`;
        reason += ` | Độ tin cậy: ${confidence}%`;
        
        return {
            prediction: predLabel,
            confidence: confidence,
            details: {
                totalAlgorithms: predictions.length,
                usedAlgorithms: usedAlgorithms,
                breakSignals: breakCount,
                scoreT: Math.round(scoreT / totalWeight * 100),
                scoreX: Math.round(scoreX / totalWeight * 100),
                reason: reason
            }
        };
    }

    // ==================== EXPORT MODULE ====================
    // Hỗ trợ cả Node.js và browser
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { combinedPredict };
    } else if (typeof window !== 'undefined') {
        window.duDoan = { combinedPredict };
    } else {
        // Fallback
        this.duDoan = { combinedPredict };
    }

    console.log('🧠 Module du_doan.js đã tải thành công!');
    console.log('📊 50+ thuật toán được gộp thành 1 module duy nhất');

})();