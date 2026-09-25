import json
import os
import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash

DB_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = Path(os.environ.get("IDLE_MARKET_DB", str(DB_DIR / "idle_market.db")))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT '其他',
    condition TEXT NOT NULL DEFAULT '九成新',
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    images TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    unread_buyer INTEGER NOT NULL DEFAULT 0,
    unread_seller INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_created ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_item ON conversations(item_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
"""

SEED_ITEMS = [
    {
        "title": "九成新 机械键盘 红轴 87键",
        "price": 129,
        "category": "数码电子",
        "condition": "九成新",
        "location": "山东 济南",
        "description": "使用不到半年，红轴手感舒适，键帽无打油，附赠拔键器。",
        "images": ["https://picsum.photos/seed/keyboard1/600/450"],
        "created_at": "2026-09-24 10:30:00",
    },
    {
        "title": "全新 小米手环 8 未拆封",
        "price": 189,
        "category": "数码电子",
        "condition": "全新",
        "location": "北京",
        "description": "抽奖中的全新手环，未拆封，颜色黑色，出给需要的朋友。",
        "images": ["https://picsum.photos/seed/band1/600/450"],
        "created_at": "2026-09-24 09:00:00",
    },
    {
        "title": "二手 iPhone 13 128G 蓝色",
        "price": 3199,
        "category": "数码电子",
        "condition": "八成新",
        "location": "上海",
        "description": "国行无拆修，电池健康 89%，边框轻微使用痕迹，屏幕无划痕。",
        "images": ["https://picsum.photos/seed/iphone13/600/450"],
        "created_at": "2026-09-23 18:20:00",
    },
    {
        "title": "秋冬羽绒服 女款 M码 白色",
        "price": 159,
        "category": "服饰鞋包",
        "condition": "九成新",
        "location": "浙江 杭州",
        "description": "穿过两三次，洗净消毒后出售，含绒量 90%，适合北方冬季。",
        "images": ["https://picsum.photos/seed/coat1/600/450"],
        "created_at": "2026-09-23 15:00:00",
    },
    {
        "title": "Nike 跑步鞋 42码 黑白配色",
        "price": 210,
        "category": "服饰鞋包",
        "condition": "七成新",
        "location": "广东 深圳",
        "description": "尺码偏大半码，鞋底磨损正常，鞋面无破损，已清洗。",
        "images": ["https://picsum.photos/seed/shoes1/600/450"],
        "created_at": "2026-09-22 11:10:00",
    },
    {
        "title": "考研数学 全套教材 含真题",
        "price": 45,
        "category": "图书教材",
        "condition": "八成新",
        "location": "江苏 南京",
        "description": "高数、线代、概率论教材加十年真题，笔记工整，一次上岸。",
        "images": ["https://picsum.photos/seed/math1/600/450"],
        "created_at": "2026-09-22 09:40:00",
    },
    {
        "title": "尤克里里 23寸 初学者款",
        "price": 99,
        "category": "文娱乐器",
        "condition": "九成新",
        "location": "湖北 武汉",
        "description": "琴身无磕碰，音色明亮，附赠调音器和教学卡。",
        "images": ["https://picsum.photos/seed/ukulele1/600/450"],
        "created_at": "2026-09-21 20:00:00",
    },
    {
        "title": "折叠自行车 铝合金 16寸",
        "price": 450,
        "category": "运动户外",
        "condition": "八成新",
        "location": "四川 成都",
        "description": "通勤神器，折叠后放后备箱无压力，刹车灵敏，胎压充足。",
        "images": ["https://picsum.photos/seed/bike1/600/450"],
        "created_at": "2026-09-21 14:30:00",
    },
    {
        "title": "美的 电饭煲 4L 智能预约",
        "price": 120,
        "category": "生活家居",
        "condition": "九成新",
        "location": "陕西 西安",
        "description": "搬家出售，几乎全新，内胆无划痕，支持 24 小时预约。",
        "images": ["https://picsum.photos/seed/ricecooker1/600/450"],
        "created_at": "2026-09-20 19:00:00",
    },
    {
        "title": "乐高 城市系列 未拆盒",
        "price": 260,
        "category": "文娱乐器",
        "condition": "全新",
        "location": "天津",
        "description": "朋友送的，家里没地方放，原封未拆，可小刀。",
        "images": ["https://picsum.photos/seed/lego1/600/450"],
        "created_at": "2026-09-20 10:00:00",
    },
    {
        "title": "露营帐篷 双人 带防潮垫",
        "price": 180,
        "category": "运动户外",
        "condition": "七成新",
        "location": "山东 青岛",
        "description": "户外用过三次，防风防雨，杆件完好，附防潮垫和收纳袋。",
        "images": ["https://picsum.photos/seed/tent1/600/450"],
        "created_at": "2026-09-19 16:00:00",
    },
    {
        "title": "kindle paperwhite 4 8G",
        "price": 350,
        "category": "数码电子",
        "condition": "八成新",
        "location": "福建 厦门",
        "description": "背光清晰，无划痕，续航正常，闲置吃灰出掉。",
        "images": ["https://picsum.photos/seed/kindle1/600/450"],
        "created_at": "2026-09-18 12:00:00",
    },
]

DEMO_USERNAME = "阿橙"
DEMO_PASSWORD = "demo123"


def get_connection():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_connection() as conn:
        conn.executescript(SCHEMA)


def query(sql, params=(), fetch_one=False):
    with get_connection() as conn:
        cur = conn.execute(sql, params)
        if fetch_one:
            row = cur.fetchone()
            return dict(row) if row else None
        return [dict(r) for r in cur.fetchall()]


def execute(sql, params=()):
    with get_connection() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid


def seed_if_empty():
    init_db()
    count = query("SELECT COUNT(*) AS n FROM users", fetch_one=True)["n"]
    if count > 0:
        return
    demo_id = execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (DEMO_USERNAME, generate_password_hash(DEMO_PASSWORD)),
    )
    for it in SEED_ITEMS:
        execute(
            "INSERT INTO items (user_id, title, price, category, condition, location, description, images, status, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)",
            (
                demo_id,
                it["title"],
                it["price"],
                it["category"],
                it["condition"],
                it["location"],
                it["description"],
                json.dumps(it["images"], ensure_ascii=False),
                it["created_at"],
            ),
        )


if __name__ == "__main__":
    init_db()
    seed_if_empty()
    print(f"Database ready at {DB_PATH}")
