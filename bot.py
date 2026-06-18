# -*- coding: utf-8 -*-
# =========================================================================
# PHẦN 1: CẤU HÌNH HỆ THỐNG & QUẢN LÝ CƠ SỞ DỮ LIỆU
# =========================================================================
import telebot, threading, time, requests, string, json, os, pytz, random, traceback
from datetime import datetime, timedelta
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove, InlineKeyboardMarkup, InlineKeyboardButton

# ================== CẤU HÌNH BOT & ADMIN ==================
TOKEN = '8739190418:AAENc1qHr9EFBUCK_9HjDzyRhyojaoXa83I'
OWNER_IDS = [8605217948, 7118616226]  # DANH SÁCH ADMIN - ĐÃ FIX
bot = telebot.TeleBot(TOKEN)

# ================== THÔNG TIN BANK VÀ GÓI KEY ==================
STK = "1067391608"
NGAN_HANG = "VCB"
BANG_GIA = {
    "1d": {"name": "1 Ngày", "price": 20000, "days": 1},
    "3d": {"name": "3 Ngày", "price": 55000, "days": 3},
    "7d": {"name": "1 Tuần", "price": 110000, "days": 7},
    "30d": {"name": "1 Tháng", "price": 330000, "days": 30},
    "vv": {"name": "Vĩnh Viễn", "price": 600000, "days": 36500}
}

# ================== URL API CÁC GAME ==================
API_68GB_MD5   = "https://chuck-ent-nicole-leadership.trycloudflare.com/api/68/md5"
API_68GB_HU    = "https://financing-patio-beast-invention.trycloudflare.com/api/68/thuong"
API_SICBO_SUN  = "https://blowing-proved-pick-importantly.trycloudflare.com/api/sunsicbo"
API_HIT_MD5    = "https://subdivision-term-came-attempting.trycloudflare.com/api/txmd5"
API_HIT_HU     = "https://subdivision-term-came-attempting.trycloudflare.com/api/tx"
API_SICBO_HIT  = "https://leslie-richardson-rrp-virtue.trycloudflare.com/sicbo/hitclub"
API_789_TX     = "https://packet-veterinary-organ-ministers.trycloudflare.com/api/tx"
API_SICBO_789  = "https://leslie-richardson-rrp-virtue.trycloudflare.com/sicbo/789club"
API_LC79_HU    = "https://thread-broke-artwork-compound.trycloudflare.com/api/tx"
API_LC79_MD5   = "https://thread-broke-artwork-compound.trycloudflare.com/api/txmd5" 

data_lock = threading.Lock()

# ================== CÁC HÀM XỬ LÝ ĐỌC/GHI FILE JSON ==================
def save_json(filename, data):
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    except Exception as e:
        print(f"Lỗi lưu file {filename}: {e}")

def load_json(filename):
    if os.path.exists(filename):
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Lỗi đọc file {filename}: {e}")
            return {}
    return {}

def is_admin(user_id):
    """Kiểm tra user có phải admin không"""
    return user_id in OWNER_IDS

# ================== KHỞI TẠO BỘ NHỚ TẠM CỦA BOT ==================
_active_keys_raw   = load_json("keys.json")
_authenticated_raw = load_json("auth_users.json")
_kicked_raw        = load_json("kicked.json")

active_keys = {}
for k, v in (_active_keys_raw or {}).items():
    if isinstance(v, str):
        try: dt = datetime.fromisoformat(v)
        except:
            try: dt = datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
            except: dt = None
        if dt and dt > datetime.now():
            active_keys[k] = dt

authenticated_users = {}
if isinstance(_authenticated_raw, dict):
    for uid_str, v in _authenticated_raw.items():
        try: dt = datetime.fromisoformat(v)
        except:
            try: dt = datetime.strptime(v, "%Y-%m-%d %H:%M:%S")
            except: dt = None
        if dt and dt > datetime.now():
            try: authenticated_users[int(uid_str)] = dt
            except: pass

# FIX: Thêm tất cả admin vào danh sách authenticated
for admin_id in OWNER_IDS:
    authenticated_users[admin_id] = datetime.now() + timedelta(days=365*100)

kicked_users  = set(_kicked_raw) if isinstance(_kicked_raw, list) else set()
running_users = set()
user_data     = {}
user_state    = {} 

def save_keys_file():
    with data_lock:
        tosave = {k: v.isoformat() for k, v in active_keys.items()}
        save_json("keys.json", tosave)

def save_auth_users_file():
    with data_lock:
        tosave = {str(uid): v.isoformat() for uid, v in authenticated_users.items()}
        save_json("auth_users.json", tosave)

def save_kicked_file():
    with data_lock:
        save_json("kicked.json", list(kicked_users))

# ================== CÁC HÀM TIỆN ÍCH HỆ THỐNG ==================
def safe_int(value, default=0):
    try:
        if value is None: return default
        return int(str(value).strip())
    except: return default

def check_key(uid):
    with data_lock:
        expiry = authenticated_users.get(uid)
        if not expiry: return None
        if isinstance(expiry, str):
            try:
                expiry = datetime.fromisoformat(expiry)
                authenticated_users[uid] = expiry
                save_auth_users_file()
            except: return None
        if isinstance(expiry, datetime) and expiry > datetime.now():
            return expiry
        return None

def load_orders(): return load_json("orders.json")
def save_orders(orders): save_json("orders.json", orders)
def load_keys(): return load_json("keys.json")
def save_keys(keys): save_json("keys.json", keys)

def make_order_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=7))

def generate_unique_key():
    keys = load_keys()
    for _ in range(2000):
        key = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        if key not in keys: return key
    return ''.join(random.choices(string.ascii_letters + string.digits, k=12))

def save_new_order(user_id, key_type, order_code):
    orders = load_orders()
    orders[order_code] = {
        "user_id": user_id,
        "key_type": key_type,
        "status": "pending",
        "created_at": datetime.now().isoformat()
    }
    save_orders(orders)

save_keys_file()
save_auth_users_file()
save_kicked_file()

# =========================================================================
# PHẦN 2: CÁC THUẬT TOÁN PHÂN TÍCH AI & MD5
# =========================================================================

def du_doan_main(data_kq, dem_sai, pattern_sai, xx, diem_lich_su, data):
    try:
        xx_list = xx.split("-")
        tong = sum(int(x) for x in xx_list)
    except: xx_list = ["0","0","0"]; tong = 0
    data_kq = data_kq[-50:]
    cuoi = data_kq[-1] if data_kq else None
    pattern = "".join("T" if x == "Tài" else "X" for x in data_kq)
    if dem_sai >= 5: return ("Tài" if tong % 2 else "Xỉu"), 75, "Reset khi thua sâu → tổng xúc xắc"
    if dem_sai >= 3: return ("Xỉu" if cuoi == "Tài" else "Tài"), 85, f"Thua {dem_sai} phiên → bẻ cầu"
    
    pattern_memory = data.get("pattern_memory", {})
    matched_pred, matched_confidence = None, 0
    for pat, stats in pattern_memory.items():
        if pattern.endswith(pat):
            count, correct = stats.get("count", 0), stats.get("correct", 0)
            confidence = correct / count if count > 0 else 0
            if count >= 5 and confidence >= 0.7 and confidence > matched_confidence:
                matched_confidence = confidence; matched_pred = stats.get("next_pred")
    if matched_pred: return matched_pred, 88, f"Học cầu nhớ ({matched_confidence:.2f})"
    if len(data_kq) >= 4:
        last4 = data_kq[-4:]
        if last4.count("Tài") == 2 and last4.count("Xỉu") == 2: return ("Xỉu" if cuoi == "Tài" else "Tài"), 86, "Cầu nhiễu nhịp 2-2"
        
    def do_ben_inner(dq):
        if not dq: return 0
        last, count = dq[-1], 0
        for kq in reversed(dq):
            if kq == last: count += 1
            else: break
        return count
    ben = do_ben_inner(data_kq)
    if ben >= 4: return ("Xỉu" if cuoi == "Tài" else "Tài"), 87, f"Bệt dài {ben} → bẻ"
    if ben >= 2: return cuoi, 80, f"Bệt nhẹ {ben} → theo bệt"
    if len(set(xx_list)) == 1:
        if xx_list[0] in ["1","2","4"]: return "Xỉu", 90, f"Bộ 3 đồng nhất {xx_list[0]}"
        if xx_list[0] in ["3","5"]: return "Tài", 90, f"Bộ 3 đồng nhất {xx_list[0]}"
    counts = {"Tài": data_kq.count("Tài"), "Xỉu": data_kq.count("Xỉu")}
    if abs(counts["Tài"] - counts["Xỉu"]) >= 4: return ("Tài" if counts["Tài"] < counts["Xỉu"] else "Xỉu"), 82, "Cầu lệch biến đổi"
    return ("Tài" if tong >= 11 else "Xỉu"), 70, "An toàn tính theo điểm nút"

def predict_taixiu(lich_su):
    try:
        if not isinstance(lich_su, list) or len(lich_su) < 3: return "ĐANG PHÂN TÍCH", [], 50, None
        recent = [safe_int(x) for x in lich_su[-20:] if safe_int(x, -1) >= 0]
        if len(recent) < 3: return "ĐANG PHÂN TÍCH", [], 50, None
        pattern, tai, xiu, freq = "", 0, 0, {}
        for i, diem in enumerate(recent):
            weight = (i + 1) / len(recent); freq[diem] = freq.get(diem, 0) + weight
            if diem >= 11: pattern += "T"; tai += weight
            else: pattern += "X"; xiu += weight
        if len(pattern) < 3: return "ĐANG PHÂN TÍCH", [], 50, None
        streak = 1
        for i in range(len(pattern)-1, 0, -1):
            if pattern[i] == pattern[i-1]: streak += 1
            else: break
        last, last2, last3 = pattern[-1], pattern[-2:], pattern[-3:]
        if streak >= 4: du_doan = "TÀI" if last == "T" else "XỈU"
        elif last3 == "TTT": du_doan = "XỈU"
        elif last3 == "XXX": du_doan = "TÀI"
        elif last2 == "TX": du_doan = "TÀI"
        elif last2 == "XT": du_doan = "XỈU"
        else: du_doan = "TÀI" if tai >= xiu else "XỈU"
        candidates = range(11, 18) if du_doan == "TÀI" else range(4, 11)
        center = {4:1,5:2,6:3,7:4,8:5,9:4,10:3,11:3,12:4,13:5,14:4,15:3,16:2,17:1}
        score = sorted([(n, freq.get(n,0)*0.7 + center[n]*0.3) for n in candidates], key=lambda x: x[1], reverse=True)
        vi = [x[0] for x in score[:3]]
        combo = None
        for a in range(1,7):
            for b in range(1,7):
                for c in range(1,7):
                    if a+b+c in vi: combo = f"{a}-{b}-{c}"; break
                if combo: break
            if combo: break
        tong_w = tai + xiu
        tin_cay = 50 if tong_w == 0 else int((max(tai,xiu)/tong_w)*100)
        if streak >= 3: tin_cay += 5
        return du_doan, vi, max(50, min(95, tin_cay)), combo
    except: return "ĐANG PHÂN TÍCH", [], 50, None

def predict_ai_markov(history):
    if len(history) < 3: return f"{len(history)}/3", 0
    tx = []
    for x in history[-3:]:
        try: tx.append(str(x).split("_")[0].upper())
        except: continue
    if len(tx) < 3: return "ĐANG PHÂN TÍCH", 0
    m1 = {}
    for i in range(len(tx)-1):
        a, b = tx[i], tx[i+1]; w = i+1
        if a not in m1: m1[a] = {"TÀI":0,"XỈU":0}
        if b in m1[a]: m1[a][b] += w
    m2 = {}
    for i in range(len(tx)-2):
        key, nxt = (tx[i], tx[i+1]), tx[i+2]; w = i+1
        if key not in m2: m2[key] = {"TÀI":0,"XỈU":0}
        if nxt in m2[key]: m2[key][nxt] += w
    last1, last2 = tx[-1], (tx[-2], tx[-1])
    if last2 in m2:
        t, x = m2[last2]["TÀI"], m2[last2]["XỈU"]
        if t+x > 0: return ("TÀI", int(50+(t/(t+x))*50)) if t > x else ("XỈU", int(50+(x/(t+x))*50))
    if last1 in m1:
        t, x = m1[last1]["TÀI"], m1[last1]["XỈU"]
        if t+x > 0: return ("TÀI", int(50+(t/(t+x))*50)) if t > x else ("XỈU", int(50+(x/(t+x))*50))
    return "TÀI", 50

def analyze_md5(md5_str):
    md5 = md5_str.strip().lower()
    last_char = md5[-1] if md5 else "f"
    if last_char in ["a","0","2","4","6","8"]:
        return "Xỉu", random.randint(78, 96)
    elif last_char in ["1","3","5","7","9","b","c","d","e","f"]:
        return "Tài", random.randint(77, 95)
    else:
        return random.choice(["Tài","Xỉu"]), random.randint(65, 80)

# =========================================================================
# PHẦN 3: BAN PHÍM MENU & CÁC VÒNG LẶP ĐỌC API GAME RUNNING
# =========================================================================

LINE, LINE2, LOGO = "─────────────────────", "═════════════════════", "🤖 𝗔𝗜 𝗧𝗢𝗢𝗟 𝗣𝗥𝗢"

def kb_chua_co_key():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("💳 Mua Key"), KeyboardButton("🔑 Nhập Key"))
    kb.add(KeyboardButton("📞 Liên Hệ Admin"))
    return kb

def kb_da_co_key():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🎮 Chọn Game"), KeyboardButton("📞 Liên Hệ Admin"))
    kb.add(KeyboardButton("🔍 Kiểm Tra Key"))
    return kb

def kb_chon_game():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🌞 Sunwin"), KeyboardButton("🎯 Hit Club"))
    kb.add(KeyboardButton("🃏 789 Club"), KeyboardButton("🎲 68GB"))
    kb.add(KeyboardButton("🎰 LC79"), KeyboardButton("⬅️ Quay Lại"))
    return kb

def kb_68gb():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🎲 68GB MD5"), KeyboardButton("🏆 68GB Hũ"))
    kb.add(KeyboardButton("⏹ Dừng 68GB"), KeyboardButton("⬅️ Quay Lại"))
    return kb

def kb_sunwin():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🎲 TX Sunwin"), KeyboardButton("🎰 Sicbo Sun"))
    kb.add(KeyboardButton("⏹ Dừng Sunwin"), KeyboardButton("⬅️ Quay Lại"))
    return kb

def kb_hitclub():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🔐 Hit MD5"), KeyboardButton("🏆 Hit Hũ"))
    kb.add(KeyboardButton("🎲 Sicbo Hit"), KeyboardButton("⏹ Dừng Hit"))
    kb.add(KeyboardButton("⬅️ Quay Lại"))
    return kb

def kb_789club():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🎯 789 TX"), KeyboardButton("🎲 Sicbo 789"))
    kb.add(KeyboardButton("⏹ Dừng 789"), KeyboardButton("⬅️ Quay Lại"))
    return kb

def kb_lc79():
    kb = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    kb.add(KeyboardButton("🏆 LC79 Hũ"), KeyboardButton("🔐 LC79 MD5"))
    kb.add(KeyboardButton("⏹ Dừng LC79"), KeyboardButton("⬅️ Quay Lại"))
    return kb

def msg_start_chua_key(name):
    return (
        f"╔{LINE2}╗\n║ {LOGO} ║\n╚{LINE2}╝\n\n👋 Xin chào <b>{name}</b>!\n\n"
        f"⚠️ Bạn <b>chưa có key</b> hoặc key đã hết hạn.\n\n💰 <b>BẢNG GIÁ KEY</b>\n{LINE}\n"
        f" 🕐 1 Ngày → <b>20.000đ</b>\n 🕒 3 Ngày → <b>55.000đ</b>\n 📅 1 Tuần → <b>110.000đ</b>\n"
        f" 🗓 1 Tháng → <b>330.000đ</b>\n ♾️ Vĩnh Viễn → <b>600.000đ</b>\n{LINE}\n\n👇 Chọn thao tác bên dưới:"
    )

def msg_start_co_key(name, expire):
    rem = expire - datetime.now() if expire else None
    time_str = f"{rem.days}n {rem.seconds//3600}g {(rem.seconds//60)%60}p" if rem else "Vĩnh viễn"
    return (
        f"╔{LINE2}╗\n║ {LOGO} ║\n╚{LINE2}╝\n\n✅ Xin chào <b>{name}</b>!\n\n"
        f"🔑 Key còn: <b>{time_str}</b>\n⏰ Hết hạn: <b>{expire.strftime('%H:%M %d/%m/%Y') if expire else '∞'}</b>\n\n👇 Chọn thao tác bên dưới:"
    )

# =================== VÒNG LẶP LẤY DỮ LIỆU API GAME ===================
def auto_loop_68gb_md5(uid, chat_id):
    error_count = 0; running_users.add(uid)
    while uid in running_users:
        try:
            if not is_admin(uid) and not check_key(uid):
                bot.send_message(chat_id, "❌ Key hết hạn!"); running_users.discard(uid); break
            try:
                r = requests.get(API_68GB_MD5, timeout=5)
                if r.status_code != 200: time.sleep(3); continue
                data = r.json()
            except: time.sleep(3); continue

            phien = str(data.get("Phien") or data.get("phien") or "").strip()
            md5_str = str(data.get("Md5") or data.get("md5") or "").strip()
            if not phien or not md5_str: time.sleep(3); continue

            user_data.setdefault(uid, {"last_phien_68gb_md5": ""})
            if user_data[uid]["last_phien_68gb_md5"] == phien: time.sleep(3); continue
            user_data[uid]["last_phien_68gb_md5"] = phien

            try: phien_ht = str(int(phien) + 1)
            except: phien_ht = "..."

            du_doan, tin_cay = analyze_md5(md5_str)

            text = (
                f"🎲 <b>68GB MD5 - PHÂN TÍCH CHUỖI</b>\n"
                f"{LINE}\n"
                f"📌 Phiên hiện tại: <b>#{phien}</b>\n"
                f"🔑 Chuỗi MD5: <code>{md5_str[:15]}...{md5_str[-10:]}</code>\n"
                f"{LINE}\n"
                f"🔮 Dự đoán kết quả phiên <b>#{phien_ht}</b>\n"
                f"➡️  Kết quả: <b>{du_doan.upper()}</b>  •  {tin_cay}%"
            )
            bot.send_message(chat_id, text, parse_mode="HTML")
            error_count = 0
        except Exception as e:
            error_count += 1
            if error_count >= 10: running_users.discard(uid); break
        time.sleep(3)

def auto_loop_sunwin_tx(uid, chat_id):
    error_count = 0; running_users.add(uid)
    while uid in running_users:
        try:
            if not is_admin(uid) and not check_key(uid):
                bot.send_message(chat_id, "❌ Key hết hạn!"); running_users.discard(uid); break
            try:
                r = requests.get("http://103.249.116.192:1001/api/ditmemaysun", timeout=10)
                if r.status_code != 200: time.sleep(3); continue
                js = r.json()
            except: time.sleep(3); continue
            data_api = js.get("data", js)
            phien = int(data_api.get("Phien") or data_api.get("phien") or 0)
            xx1 = int(data_api.get("Xuc_xac_1") or data_api.get("xuc_xac_1") or 0)
            xx2 = int(data_api.get("Xuc_xac_2") or data_api.get("xuc_xac_2") or 0)
            xx3 = int(data_api.get("Xuc_xac_3") or data_api.get("xuc_xac_3") or 0)
            tong = xx1+xx2+xx3; kq = "Tài" if tong >= 11 else "Xỉu"; xx = f"{xx1}-{xx2}-{xx3}"
            if not phien: time.sleep(3); continue
            lp_key = "last_phien_sunwin_tx"; ls_key = "lich_su_sunwin_tx"
            user_data.setdefault(uid, {})
            d = user_data[uid]
            d.setdefault(lp_key, 0); d.setdefault(ls_key, []); d.setdefault("dem_sai", 0)
            if phien <= d[lp_key]: time.sleep(3); continue
            d[lp_key] = phien; d[ls_key].append(kq)
            du_tx, do_tin, loai_cau = du_doan_main(d[ls_key], d["dem_sai"], set(), xx, [], d)
            text = (f"🌞 <b>SUNWIN TX</b>\n{LINE}\n📌 Phiên: <b>#{phien}</b> 🎲 [{xx}]\n"
                    f"📊 KQ: <b>{kq} ({tong})</b>\n{LINE}\n"
                    f"🔮 Dự đoán <b>#{phien+1}</b>\n➡️ <b>{du_tx}</b> • {do_tin}%\n💡 <i>{loai_cau}</i>")
            bot.send_message(chat_id, text, parse_mode="HTML")
            error_count = 0
        except: error_count += 1
        if error_count >= 10: running_users.discard(uid); break
        time.sleep(3)

# =================== HELPER: parse sicbo/tx API response ===================
def _parse_tx_response(js):
    """Trả về (phien, xx1, xx2, xx3) từ nhiều cấu trúc JSON khác nhau."""
    if "current" in js:
        d = js["current"]
        phien = int(d.get("phien") or 0)
        xx = d.get("xuc_xac", [0, 0, 0])
        return phien, int(xx[0]), int(xx[1]), int(xx[2])
    data_api = js.get("data", js)
    raw_phien = str(data_api.get("Phien") or data_api.get("phien") or "0").replace("#","").strip()
    try: phien = int(raw_phien)
    except: phien = 0
    xx1 = int(data_api.get("Xuc_xac_1") or data_api.get("xuc_xac_1") or data_api.get("dice1") or data_api.get("Dice1") or 0)
    xx2 = int(data_api.get("Xuc_xac_2") or data_api.get("xuc_xac_2") or data_api.get("dice2") or data_api.get("Dice2") or 0)
    xx3 = int(data_api.get("Xuc_xac_3") or data_api.get("xuc_xac_3") or data_api.get("dice3") or data_api.get("Dice3") or 0)
    return phien, xx1, xx2, xx3

def _make_tx_loop(uid, chat_id, api_url, game_label, user_key_prefix, is_sicbo=False):
    """Vòng lặp chung cho các game Tài Xỉu / Sicbo."""
    error_count = 0; running_users.add(uid)
    while uid in running_users:
        try:
            if not is_admin(uid) and not check_key(uid):
                bot.send_message(chat_id, "❌ Key hết hạn!"); running_users.discard(uid); break
            try:
                r = requests.get(api_url, timeout=10)
                if r.status_code != 200: time.sleep(3); continue
                js = r.json()
            except: time.sleep(3); continue
            phien, xx1, xx2, xx3 = _parse_tx_response(js)
            if not phien: time.sleep(3); continue
            tong = xx1+xx2+xx3; kq = "Tài" if tong >= 11 else "Xỉu"; xx = f"{xx1}-{xx2}-{xx3}"
            lp_key = f"last_phien_{user_key_prefix}"
            ls_key = f"lich_su_{user_key_prefix}"
            tong_key = f"lich_su_tong_{user_key_prefix}"
            user_data.setdefault(uid, {})
            d = user_data[uid]
            d.setdefault(lp_key, 0); d.setdefault(ls_key, []); d.setdefault(tong_key, []); d.setdefault("dem_sai", 0)
            if phien <= d[lp_key]: time.sleep(3); continue
            d[lp_key] = phien; d[ls_key].append(kq); d[tong_key].append(tong)
            du_tx, do_tin, loai_cau = du_doan_main(d[ls_key], d["dem_sai"], set(), xx, [], d)

            if is_sicbo:
                if du_tx == "Tài":
                    candidates = range(11, 18)
                else:
                    candidates = range(4, 11)
                center = {4:1,5:2,6:3,7:4,8:5,9:4,10:3,11:3,12:4,13:5,14:4,15:3,16:2,17:1}
                freq_tong = {}
                for t in d[tong_key]: freq_tong[t] = freq_tong.get(t, 0) + 1
                score_combo = sorted([(n, freq_tong.get(n,0)*0.7 + center[n]*0.3) for n in candidates], key=lambda x: x[1], reverse=True)
                vi = [x[0] for x in score_combo[:3]]
                combo = None
                for a in range(1,7):
                    for b in range(1,7):
                        for c in range(1,7):
                            if a+b+c in vi: combo = f"{a}-{b}-{c}"; break
                        if combo: break
                    if combo: break
                vi_str = ", ".join(str(v) for v in vi) if vi else "Đang tích lũy..."
                combo_str = f"\n🎯 Bộ lót: <b>{combo}</b>" if combo else ""
                extra = f"\n📈 Điểm gợi ý: <b>{vi_str}</b>{combo_str}"
            else:
                extra = ""

            text = (f"🎲 <b>{game_label}</b>\n{LINE}\n"
                    f"📌 Phiên: <b>#{phien}</b> 🎲 [{xx}]\n"
                    f"📊 KQ: <b>{kq} ({tong})</b>\n{LINE}\n"
                    f"🔮 Dự đoán <b>#{phien+1}</b>\n"
                    f"➡️ <b>{du_tx}</b> • {do_tin}%\n"
                    f"💡 <i>{loai_cau}</i>{extra}")
            bot.send_message(chat_id, text, parse_mode="HTML")
            error_count = 0
        except: error_count += 1
        if error_count >= 10: running_users.discard(uid); break
        time.sleep(3)

def auto_loop_sicbo_sun(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_SICBO_SUN, "SICBO SUNWIN", "sicbo_sun", is_sicbo=True)

def auto_loop_hitclub_md5(uid, chat_id):
    error_count = 0; running_users.add(uid)
    while uid in running_users:
        try:
            if not is_admin(uid) and not check_key(uid):
                bot.send_message(chat_id, "❌ Key hết hạn!"); running_users.discard(uid); break
            try:
                r = requests.get(API_HIT_MD5, timeout=5)
                if r.status_code != 200: time.sleep(3); continue
                data = r.json()
            except: time.sleep(3); continue
            phien = str(data.get("phien") or data.get("Phien") or "").strip()
            md5_str = str(data.get("md5_enc") or data.get("Md5") or data.get("md5") or "").strip()
            xx1 = int(data.get("xuc_xac_1") or 0)
            xx2 = int(data.get("xuc_xac_2") or 0)
            xx3 = int(data.get("xuc_xac_3") or 0)
            tong = int(data.get("tong") or xx1+xx2+xx3)
            kq = "Tài" if tong >= 11 else "Xỉu"
            xx = f"{xx1}-{xx2}-{xx3}"
            if not phien: time.sleep(3); continue
            user_data.setdefault(uid, {"last_phien_hit_md5": ""})
            if user_data[uid].get("last_phien_hit_md5") == phien: time.sleep(3); continue
            user_data[uid]["last_phien_hit_md5"] = phien
            try: phien_ht = str(int(phien) + 1)
            except: phien_ht = "..."
            d = user_data[uid]
            d.setdefault("lich_su_hit_md5", []); d.setdefault("dem_sai", 0)
            d["lich_su_hit_md5"].append(kq)
            du_tx, do_tin, loai_cau = du_doan_main(d["lich_su_hit_md5"], d["dem_sai"], set(), xx, [], d)
            text = (f"🔐 <b>HIT CLUB MD5 - PHÂN TÍCH</b>\n{LINE}\n"
                    f"📌 Phiên: <b>#{phien}</b> 🎲 [{xx}]\n"
                    f"📊 KQ: <b>{kq} ({tong})</b>\n"
                    f"🔑 MD5: <code>{md5_str[:20]}...</code>\n{LINE}\n"
                    f"🔮 Dự đoán phiên <b>#{phien_ht}</b>\n"
                    f"➡️ <b>{du_tx}</b>  •  {do_tin}%\n"
                    f"💡 <i>{loai_cau}</i>")
            bot.send_message(chat_id, text, parse_mode="HTML")
            error_count = 0
        except: error_count += 1
        if error_count >= 10: running_users.discard(uid); break
        time.sleep(3)

def auto_loop_789_tx(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_789_TX, "789 CLUB TX", "789_tx")

def auto_loop_hit_hu(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_HIT_HU, "HIT HŨ", "hit_hu")

def auto_loop_sicbo_789(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_SICBO_789, "SICBO 789 CLUB", "sicbo_789", is_sicbo=True)

def auto_loop_sicbo_hit(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_SICBO_HIT, "SICBO HIT CLUB", "sicbo_hit", is_sicbo=True)

def auto_loop_68gb_hu(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_68GB_HU, "68GB HŨ", "68gb_hu")

def auto_loop_lc79_hu(uid, chat_id):
    _make_tx_loop(uid, chat_id, API_LC79_HU, "LC79 HŨ", "lc79_hu")

def auto_loop_lc79_md5(uid, chat_id):
    error_count = 0; running_users.add(uid)
    while uid in running_users:
        try:
            if not is_admin(uid) and not check_key(uid):
                bot.send_message(chat_id, "❌ Key hết hạn!"); running_users.discard(uid); break
            try:
                r = requests.get(API_LC79_MD5, timeout=5)
                if r.status_code != 200: time.sleep(3); continue
                data = r.json()
            except: time.sleep(3); continue
            phien = str(data.get("phien") or data.get("Phien") or "").strip()
            xx1 = int(data.get("xuc_xac_1") or 0)
            xx2 = int(data.get("xuc_xac_2") or 0)
            xx3 = int(data.get("xuc_xac_3") or 0)
            tong = int(data.get("tong") or xx1+xx2+xx3)
            kq = "Tài" if tong >= 11 else "Xỉu"
            xx = f"{xx1}-{xx2}-{xx3}"
            md5_raw = str(data.get("md5_raw") or "").strip()
            if not phien: time.sleep(3); continue
            user_data.setdefault(uid, {"last_phien_lc79_md5": ""})
            if user_data[uid].get("last_phien_lc79_md5") == phien: time.sleep(3); continue
            user_data[uid]["last_phien_lc79_md5"] = phien
            try: phien_ht = str(int(phien) + 1)
            except: phien_ht = "..."
            d = user_data[uid]
            d.setdefault("lich_su_lc79_md5", []); d.setdefault("dem_sai", 0)
            d["lich_su_lc79_md5"].append(kq)
            du_tx, do_tin, loai_cau = du_doan_main(d["lich_su_lc79_md5"], d["dem_sai"], set(), xx, [], d)
            text = (f"🔐 <b>LC79 MD5 - PHÂN TÍCH</b>\n{LINE}\n"
                    f"📌 Phiên: <b>#{phien}</b> 🎲 [{xx}]\n"
                    f"📊 KQ: <b>{kq} ({tong})</b>\n"
                    f"🔑 Raw: <code>{md5_raw[:30]}...</code>\n{LINE}\n"
                    f"🔮 Dự đoán phiên <b>#{phien_ht}</b>\n"
                    f"➡️ <b>{du_tx}</b>  •  {do_tin}%\n"
                    f"💡 <i>{loai_cau}</i>")
            bot.send_message(chat_id, text, parse_mode="HTML")
            error_count = 0
        except: error_count += 1
        if error_count >= 10: running_users.discard(uid); break
        time.sleep(3)

# =========================================================================
# PHẦN 4: ĐIỀU HƯỚNG TIN NHẮN (HANDLERS) & KHỞI CHẠY POLLING
# =========================================================================

@bot.message_handler(commands=['start'])
def command_start(msg):
    uid = msg.from_user.id
    if uid in kicked_users: return
    expiry = check_key(uid)
    if expiry: bot.send_message(msg.chat.id, msg_start_co_key(msg.from_user.first_name, expiry), parse_mode="HTML", reply_markup=kb_da_co_key())
    else: bot.send_message(msg.chat.id, msg_start_chua_key(msg.from_user.first_name), parse_mode="HTML", reply_markup=kb_chua_co_key())

@bot.message_handler(func=lambda msg: msg.text == "💳 Mua Key")
def handle_mua_key(msg):
    markup = InlineKeyboardMarkup(row_width=2)
    for k, v in BANG_GIA.items():
        markup.add(InlineKeyboardButton(f"{v['name']} - {v['price']:,}đ", callback_data=f"buy_{k}"))
    bot.reply_to(msg, "👇 Vui lòng lựa chọn gói thời hạn Key bạn muốn mua:", reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data.startswith("buy_"))
def callback_buy_package(call):
    uid = call.from_user.id
    username = call.from_user.username or "Không có"
    first_name = call.from_user.first_name
    
    pkg_id = call.data.replace("buy_", "")
    pkg = BANG_GIA.get(pkg_id)
    
    if not pkg:
        bot.answer_callback_query(call.id, "❌ Gói cước không tồn tại!", show_alert=True)
        return

    order_code = make_order_code()
    memo = f"NAPTIEN{order_code}"
    save_new_order(user_id=uid, key_type=pkg_id, order_code=order_code)

    thong_tin_thanh_toan = (
        f"╔{LINE2}╗\n║ 💳 THÔNG TIN THANH TOÁN CHUYỂN KHOẢN ║\n╚{LINE2}╝\n\n"
        f"🏦 Ngân Hàng: <b>{NGAN_HANG}</b>\n"
        f"🔢 Số Tài Khoản: <code>{STK}</code>\n"
        f"💵 Số Tiền: <b>{pkg['price']:,}đ</b>\n"
        f"📝 Nội Dung CK: <code>{memo}</code>\n\n"
        f"{LINE}\n"
        f"⚠️ <b>LƯU Ý QUAN TRỌNG:</b>\n"
        f"• Vui lòng chuyển đúng số tiền và nội dung chuyển khoản ở trên.\n"
        f"• Bạn chỉ cần chạm vào Số Tài Khoản hoặc Nội Dung để sao chép nhanh.\n"
        f"• Hệ thống đã gửi hóa đơn lên Admin, Key sẽ tự động kích hoạt gửi về đây ngay sau khi tiền vào tài khoản!"
    )
    
    markup_user = InlineKeyboardMarkup()
    markup_user.add(InlineKeyboardButton("🔙 Quay Lại Menu", callback_data="main_menu"))
    bot.send_message(chat_id=call.message.chat.id, text=thong_tin_thanh_toan, parse_mode="HTML", reply_markup=markup_user)

    admin_markup = InlineKeyboardMarkup()
    admin_markup.add(
        InlineKeyboardButton("✅ Duyệt Nạp", callback_data=f"approve_{order_code}"),
        InlineKeyboardButton("❌ Hủy Đơn", callback_data=f"reject_{order_code}")
    )
    admin_msg = (
        f"🔔 <b>THÔNG BÁO NẠP TIỀN</b>\n"
        f"{LINE}\n"
        f"👤 Người Dùng: @{username}\n"
        f"📦 Gói mua: <b>{pkg['name']}</b>\n"
        f"💵 Số tiền: <b>{pkg['price']:,}đ</b>\n"
        f"📝 Nội dung CK: <code>{memo}</code>\n"
        f"{LINE}\n"
    )
    
    # FIX: Gửi tin nhắn cho tất cả admin
    sent_to_admin = False
    for admin_id in OWNER_IDS:
        try:
            bot.send_message(admin_id, admin_msg, parse_mode="HTML", reply_markup=admin_markup)
            sent_to_admin = True
        except Exception as e:
            print(f"Lỗi gửi tin cho admin {admin_id}: {e}")
    
    if sent_to_admin:
        bot.answer_callback_query(call.id, text="Hóa đơn đã được khởi tạo thành công!")
    else:
        bot.answer_callback_query(call.id, text="Tạm thời không thể báo Admin, nhưng đơn hàng đã được ghi nhận trên hệ thống!", show_alert=True)

@bot.callback_query_handler(func=lambda call: call.data.startswith("approve_") or call.data.startswith("reject_"))
def callback_admin_action(call):
    # FIX: Kiểm tra admin trong danh sách
    if call.from_user.id not in OWNER_IDS:
        bot.answer_callback_query(call.id, "❌ Bạn không có quyền duyệt!", show_alert=True)
        return
        
    parts = call.data.split("_", 1); action, order_code = parts[0], parts[1]
    orders = load_orders()
    if order_code not in orders:
        bot.answer_callback_query(call.id, "❌ Đơn không tồn tại!")
        return
    order = orders[order_code]
    if order["status"] != "pending":
        bot.answer_callback_query(call.id, "⚠️ Đơn này đã xử lý trước đó!")
        return
        
    user_id = order["user_id"]; pkg_id = order["key_type"]; pkg = BANG_GIA.get(pkg_id)
    
    if action == "approve":
        orders[order_code]["status"] = "completed"
        save_orders(orders)
        new_key = generate_unique_key()
        expire = datetime.now() + timedelta(days=pkg["days"])
        keys = load_keys()
        keys[new_key] = expire.isoformat()
        save_keys(keys)
        
        success_text = (
            f"🎉 <b>NẠP TIỀN THÀNH CÔNG</b>\n"
            f"{LINE}\n"
            f"✅ Đơn hàng <code>#{order_code}</code> đã được phê duyệt.\n"
            f"🔑 Key kích hoạt của bạn:\n<code>{new_key}</code>\n\n"
            f"⏰ Hạn dùng: <b>{expire.strftime('%H:%M %d/%m/%Y')}</b>\n"
            f"{LINE}\n"
            f"👉 Chọn mục <b>🔑 Nhập Key</b> để bắt đầu kích hoạt sử dụng!"
        )
        try: bot.send_message(user_id, success_text, parse_mode="HTML")
        except: pass
            
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=call.message.text + f"\n\n🟢ĐÃ DUYỆT: Hệ thống đã gửi key cho người dùng.",
            reply_markup=None
        )
        bot.answer_callback_query(call.id, "✅ Duyệt thành công!")
        
    elif action == "reject":
        orders[order_code]["status"] = "rejected"
        save_orders(orders)
        try:
            bot.send_message(user_id, f"❌ Đơn nạp <code>#{order_code}</code> đã bị từ chối phê duyệt.", parse_mode="HTML")
        except: pass
        bot.edit_message_text(
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            text=call.message.text + "\n\n🔴 <b>ĐÃ HỦY: Đơn nạp bị từ chối.</b>",
            reply_markup=None
        )
        bot.answer_callback_query(call.id, "✅ Đã hủy đơn hàng!")

@bot.message_handler(func=lambda msg: msg.text == "🔑 Nhập Key")
def ui_nhap_key(msg):
    bot.reply_to(msg, "🔑 Vui lòng nhập chính xác mã Key bản quyền của bạn vào đây:")
    user_state[msg.from_user.id] = "waiting_key"

@bot.message_handler(func=lambda msg: user_state.get(msg.from_user.id) == "waiting_key")
def process_activation_key(msg):
    uid = msg.from_user.id; key = msg.text.strip(); user_state.pop(uid, None)
    keys = load_keys()
    if key not in keys:
        bot.reply_to(msg, "❌ Mã Key không hợp lệ!")
        return
    try: expire_dt = datetime.fromisoformat(keys[key])
    except: expire_dt = datetime.strptime(keys[key], "%Y-%m-%d %H:%M:%S")
    if expire_dt <= datetime.now():
        bot.reply_to(msg, "❌ Mã Key này đã hết hạn!")
        return
    
    authenticated_users[uid] = expire_dt
    save_auth_users_file()
    del keys[key]
    save_keys(keys)
    bot.reply_to(msg, f"✅ Kích hoạt thành công!\n⏰ Hạn dùng: {expire_dt.strftime('%H:%M %d/%m/%Y')}", reply_markup=kb_da_co_key())

@bot.message_handler(func=lambda msg: msg.text in ["🎮 Chọn Game", "⬅️ Quay Lại"])
def ui_chuyen_menu(msg):
    if msg.text == "⬅️ Quay Lại":
        command_start(msg)
        return
    if not check_key(msg.from_user.id):
        bot.reply_to(msg, "❌ Bạn chưa kích hoạt key!")
        return
    bot.reply_to(msg, "🎮 Danh sách các trò chơi hệ thống hỗ trợ phân tích:", reply_markup=kb_chon_game())

@bot.message_handler(func=lambda msg: msg.text == "🎲 68GB")
def menu_68gb(msg):
    if not check_key(msg.from_user.id): return
    bot.reply_to(msg, "🎲 Sảnh game thuộc hệ thống 68 Game Bài:", reply_markup=kb_68gb())

@bot.message_handler(func=lambda msg: msg.text == "🌞 Sunwin")
def menu_sunwin(msg):
    if not check_key(msg.from_user.id): return
    bot.reply_to(msg, "🌞 Cổng Game Sunwin:", reply_markup=kb_sunwin())

@bot.message_handler(func=lambda msg: msg.text == "🎲 68GB MD5")
def start_68gb_md5(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Robot đang chạy game khác. Hãy bấm Dừng trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích dữ liệu 68GB MD5...")
    threading.Thread(target=auto_loop_68gb_md5, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text == "🎲 TX Sunwin")
def start_sunwin_tx(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Sunwin Tài Xỉu...")
    threading.Thread(target=auto_loop_sunwin_tx, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text.startswith("⏹ Dừng"))
def stop_all_games(msg):
    uid = msg.from_user.id
    if uid in running_users:
        running_users.discard(uid)
        bot.reply_to(msg, "⏹ Đã dừng tiến trình phân tích game thành công.")
    else:
        bot.reply_to(msg, "ℹ️ Hiện không có tiến trình nào đang chạy.")

@bot.message_handler(func=lambda msg: msg.text == "🔍 Kiểm Tra Key")
def check_key_status(msg):
    expiry = check_key(msg.from_user.id)
    if expiry:
        bot.reply_to(msg, f"✅ Hạn sử dụng tài khoản: {expiry.strftime('%H:%M %d/%m/%Y')}")
    else:
        bot.reply_to(msg, "❌ Tài khoản hết hạn bản quyền.", reply_markup=kb_chua_co_key())

@bot.message_handler(func=lambda msg: msg.text == "📞 Liên Hệ Admin")
def show_contact(msg):
    bot.reply_to(msg, f"📞 <b>LIÊN HỆ ADMIN</b>\n{LINE}\n👤 Admin: @kaya2908\n💬 Liên hệ hỗ trợ duyệt đơn nhanh hoặc xử lý sự cố kĩ thuật.", parse_mode="HTML")

@bot.message_handler(commands=['taokey'])
def admin_generate_key_cmd(msg):
    # FIX: Kiểm tra admin trong danh sách
    if msg.from_user.id not in OWNER_IDS:
        return
    try:
        ds = msg.text.split()[1].strip()
        unit = ds[-1]
        amount = int(ds[:-1])
        now = datetime.now()
        if unit == 'm':
            expire = now + timedelta(minutes=amount)
        elif unit == 'h':
            expire = now + timedelta(hours=amount)
        elif unit == 'd':
            expire = now + timedelta(days=amount)
        else:
            bot.reply_to(msg, "Cú pháp sai đơn vị thời gian (m/h/d)")
            return
        key = generate_unique_key()
        keys = load_keys()
        keys[key] = expire.isoformat()
        save_keys(keys)
        bot.reply_to(msg, f"🔑 Cấp mã thành công:\n<code>{key}</code>\n⏰ Hạn: {expire.strftime('%H:%M %d/%m/%Y')}", parse_mode="HTML")
    except:
        bot.reply_to(msg, "Cú pháp: /taokey 30m | 2h | 7d")

# =================== HANDLERS CÁC GAME ===================

@bot.message_handler(func=lambda msg: msg.text == "🎯 Hit Club")
def menu_hitclub(msg):
    if not check_key(msg.from_user.id): return
    bot.reply_to(msg, "🎯 Cổng Game Hit Club:", reply_markup=kb_hitclub())

@bot.message_handler(func=lambda msg: msg.text == "🃏 789 Club")
def menu_789club(msg):
    if not check_key(msg.from_user.id): return
    bot.reply_to(msg, "🃏 Cổng Game 789 Club:", reply_markup=kb_789club())

@bot.message_handler(func=lambda msg: msg.text == "🎰 LC79")
def menu_lc79(msg):
    if not check_key(msg.from_user.id): return
    bot.reply_to(msg, "🎰 Cổng Game LC79:", reply_markup=kb_lc79())

# ---- Sunwin ----
@bot.message_handler(func=lambda msg: msg.text == "🎰 Sicbo Sun")
def start_sicbo_sun(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Sicbo Sunwin...")
    threading.Thread(target=auto_loop_sicbo_sun, args=(uid, msg.chat.id), daemon=True).start()

# ---- Hit Club ----
@bot.message_handler(func=lambda msg: msg.text == "🔐 Hit MD5")
def start_hitclub_md5(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Hit Club MD5...")
    threading.Thread(target=auto_loop_hitclub_md5, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text == "🏆 Hit Hũ")
def start_hit_hu(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Hit Hũ...")
    threading.Thread(target=auto_loop_hit_hu, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text == "🎲 Sicbo Hit")
def start_sicbo_hit(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Sicbo Hit Club...")
    threading.Thread(target=auto_loop_sicbo_hit, args=(uid, msg.chat.id), daemon=True).start()

# ---- 789 Club ----
@bot.message_handler(func=lambda msg: msg.text == "🎯 789 TX")
def start_789_tx(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích 789 Club TX...")
    threading.Thread(target=auto_loop_789_tx, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text == "🎲 Sicbo 789")
def start_sicbo_789(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích Sicbo 789 Club...")
    threading.Thread(target=auto_loop_sicbo_789, args=(uid, msg.chat.id), daemon=True).start()

# ---- 68GB ----
@bot.message_handler(func=lambda msg: msg.text == "🏆 68GB Hũ")
def start_68gb_hu(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích 68GB Hũ...")
    threading.Thread(target=auto_loop_68gb_hu, args=(uid, msg.chat.id), daemon=True).start()

# ---- LC79 ----
@bot.message_handler(func=lambda msg: msg.text == "🏆 LC79 Hũ")
def start_lc79_hu(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích LC79 Hũ...")
    threading.Thread(target=auto_loop_lc79_hu, args=(uid, msg.chat.id), daemon=True).start()

@bot.message_handler(func=lambda msg: msg.text == "🔐 LC79 MD5")
def start_lc79_md5(msg):
    uid = msg.from_user.id
    if not is_admin(uid) and not check_key(uid): return
    if uid in running_users:
        bot.reply_to(msg, "⚠️ Hãy dừng trò chơi cũ trước.")
        return
    bot.reply_to(msg, "🚀 Khởi động phân tích LC79 MD5...")
    threading.Thread(target=auto_loop_lc79_md5, args=(uid, msg.chat.id), daemon=True).start()

if __name__ == "__main__":
    print("=" * 40)
    print("  🤖 AI TOOL PRO - BOT ĐÃ KHỞI CHẠY KHỚP LỆNH HOÀN TOÀN")
    print("=" * 40)
    print(f"👑 Admin IDs: {OWNER_IDS}")
    bot.infinity_polling(timeout=60, long_polling_timeout=30)
