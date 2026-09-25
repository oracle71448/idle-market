import json
import os

from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

import database

CATEGORIES = ["数码电子", "服饰鞋包", "图书教材", "运动户外", "生活家居", "文娱乐器", "其他"]
CONDITIONS = ["全新", "九成新", "八成新", "七成新", "明显使用痕迹"]

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

database.init_db()
database.seed_if_empty()


def to_iso(ts):
    if not ts:
        return ts
    return str(ts).replace(" ", "T") + "Z"


def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return database.query("SELECT * FROM users WHERE id = ?", (uid,), fetch_one=True)


@app.context_processor
def inject_user():
    user = current_user()
    return {
        "is_logged_in": user is not None,
        "current_user": user["username"] if user else None,
    }


def item_to_dict(row):
    d = dict(row)
    try:
        d["images"] = json.loads(d.get("images") or "[]")
    except (TypeError, ValueError):
        d["images"] = []
    d["created_at"] = to_iso(d["created_at"])
    return d


def load_item(item_id):
    return database.query(
        "SELECT i.*, u.username AS seller FROM items i "
        "JOIN users u ON u.id = i.user_id WHERE i.id = ?",
        (item_id,),
        fetch_one=True,
    )


@app.errorhandler(404)
def handle_not_found(exc):
    return jsonify({"error": "请求的资源不存在"}), 404


@app.errorhandler(405)
def handle_method_not_allowed(exc):
    return jsonify({"error": "请求方法不允许"}), 405


@app.errorhandler(Exception)
def handle_unexpected_error(exc):
    app.logger.error("Unhandled error: %s", exc, exc_info=True)
    return jsonify({"error": "服务器内部错误，请稍后再试"}), 500


@app.route("/")
def index():
    return render_template("index.html", active="index")


@app.route("/item/<int:item_id>")
def item_detail(item_id):
    return render_template("item.html", active="item", item_id=item_id)


@app.route("/post")
def post_page():
    return render_template("post.html", active="post", edit_id=None)


@app.route("/edit/<int:item_id>")
def edit_page(item_id):
    return render_template("post.html", active="profile", edit_id=item_id)


@app.route("/messages")
def messages_page():
    return render_template("messages.html", active="messages")


@app.route("/chat/<int:item_id>")
def chat_page(item_id):
    return render_template("chat.html", active="messages", item_id=item_id, conv_id=None)


@app.route("/chat/conv/<int:conv_id>")
def chat_conv_page(conv_id):
    return render_template("chat.html", active="messages", item_id=None, conv_id=conv_id)


@app.route("/profile")
def profile_page():
    return render_template("profile.html", active="profile")


@app.route("/login")
def login_page():
    return render_template("login.html", next=request.args.get("next", "/"))


@app.route("/register")
def register_page():
    return render_template("register.html", next=request.args.get("next", "/"))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if not (2 <= len(username) <= 20):
        return jsonify({"error": "用户名需为 2-20 个字符"}), 400
    if len(password) < 6:
        return jsonify({"error": "密码至少 6 位"}), 400
    if database.query("SELECT id FROM users WHERE username = ?", (username,), fetch_one=True):
        return jsonify({"error": "用户名已被使用"}), 400
    uid = database.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, generate_password_hash(password)),
    )
    session["user_id"] = uid
    return jsonify({"id": uid, "username": username}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    user = database.query("SELECT * FROM users WHERE username = ?", (username,), fetch_one=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "用户名或密码错误"}), 401
    session["user_id"] = user["id"]
    return jsonify({"id": user["id"], "username": user["username"]})


@app.route("/api/items")
def api_items():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    mine = request.args.get("mine") == "1"
    user = current_user()
    if mine:
        if not user:
            return jsonify({"error": "请先登录"}), 401
        rows = database.query(
            "SELECT i.*, u.username AS seller FROM items i "
            "JOIN users u ON u.id = i.user_id "
            "WHERE i.user_id = ? ORDER BY i.created_at DESC, i.id DESC",
            (user["id"],),
        )
    else:
        sql = (
            "SELECT i.*, u.username AS seller FROM items i "
            "JOIN users u ON u.id = i.user_id WHERE i.status = 'active'"
        )
        params = []
        if search:
            sql += " AND i.title LIKE ?"
            params.append("%" + search + "%")
        if category:
            sql += " AND i.category = ?"
            params.append(category)
        sql += " ORDER BY i.created_at DESC, i.id DESC"
        rows = database.query(sql, tuple(params))
    return jsonify([item_to_dict(r) for r in rows])


@app.route("/api/items/<int:item_id>")
def api_item(item_id):
    row = load_item(item_id)
    if not row:
        return jsonify({"error": "商品不存在"}), 404
    d = item_to_dict(row)
    d["seller_item_count"] = database.query(
        "SELECT COUNT(*) AS n FROM items WHERE user_id = ? AND status = 'active'",
        (row["user_id"],),
        fetch_one=True,
    )["n"]
    return jsonify(d)


def validate_item_fields(data):
    title = str(data.get("title", "")).strip()
    location = str(data.get("location", "")).strip()
    category = str(data.get("category", "")).strip()
    condition = str(data.get("condition", "")).strip()
    description = str(data.get("description", "")).strip()
    images = data.get("images") or []
    if not title:
        return None, "请填写商品标题"
    if len(title) > 40:
        return None, "标题最多 40 个字符"
    try:
        price = float(data.get("price"))
    except (TypeError, ValueError):
        return None, "价格无效"
    if price <= 0:
        return None, "价格需大于 0"
    if not location:
        return None, "请填写所在地区"
    if category not in CATEGORIES:
        return None, "类别无效"
    if condition not in CONDITIONS:
        return None, "成色无效"
    if len(description) > 500:
        return None, "描述最多 500 个字符"
    if len(images) > 6:
        return None, "图片最多 6 张"
    return {
        "title": title,
        "price": price,
        "category": category,
        "condition": condition,
        "location": location,
        "description": description,
        "images": images,
    }, None


@app.route("/api/items", methods=["POST"])
def api_create_item():
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    fields, error = validate_item_fields(request.get_json(silent=True) or {})
    if error:
        return jsonify({"error": error}), 400
    uid = database.execute(
        "INSERT INTO items (user_id, title, price, category, condition, location, "
        "description, images, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
        (
            user["id"],
            fields["title"],
            fields["price"],
            fields["category"],
            fields["condition"],
            fields["location"],
            fields["description"],
            json.dumps(fields["images"], ensure_ascii=False),
        ),
    )
    return jsonify(item_to_dict(load_item(uid))), 201


@app.route("/api/items/<int:item_id>", methods=["PUT"])
def api_update_item(item_id):
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    row = database.query("SELECT * FROM items WHERE id = ?", (item_id,), fetch_one=True)
    if not row:
        return jsonify({"error": "商品不存在"}), 404
    if row["user_id"] != user["id"]:
        return jsonify({"error": "只能编辑自己发布的商品"}), 403
    data = request.get_json(silent=True) or {}
    if "status" in data:
        status = data["status"]
        if status not in ("active", "removed"):
            return jsonify({"error": "状态无效"}), 400
        database.execute("UPDATE items SET status = ? WHERE id = ?", (status, item_id))
    else:
        fields, error = validate_item_fields(data)
        if error:
            return jsonify({"error": error}), 400
        database.execute(
            "UPDATE items SET title = ?, price = ?, category = ?, condition = ?, "
            "location = ?, description = ?, images = ? WHERE id = ?",
            (
                fields["title"],
                fields["price"],
                fields["category"],
                fields["condition"],
                fields["location"],
                fields["description"],
                json.dumps(fields["images"], ensure_ascii=False),
                item_id,
            ),
        )
    return jsonify(item_to_dict(load_item(item_id)))


def conversation_detail(cid, user):
    conv = database.query("SELECT * FROM conversations WHERE id = ?", (cid,), fetch_one=True)
    if not conv:
        return None
    item = database.query("SELECT * FROM items WHERE id = ?", (conv["item_id"],), fetch_one=True)
    if not item:
        return None
    if user["id"] != conv["buyer_id"] and user["id"] != item["user_id"]:
        return None
    if user["id"] == conv["buyer_id"]:
        database.execute("UPDATE conversations SET unread_buyer = 0 WHERE id = ?", (cid,))
    else:
        database.execute("UPDATE conversations SET unread_seller = 0 WHERE id = ?", (cid,))
    rows = database.query(
        "SELECT m.id, m.text, m.created_at, u.username AS sender "
        "FROM messages m JOIN users u ON u.id = m.sender_id "
        "WHERE m.conversation_id = ? ORDER BY m.id",
        (cid,),
    )
    buyer = database.query("SELECT username FROM users WHERE id = ?", (conv["buyer_id"],), fetch_one=True)
    seller = database.query("SELECT username FROM users WHERE id = ?", (item["user_id"],), fetch_one=True)
    return {
        "id": conv["id"],
        "item": item_to_dict(item),
        "buyer_username": buyer["username"],
        "seller_username": seller["username"],
        "messages": [
            {
                "id": m["id"],
                "sender_username": m["sender"],
                "text": m["text"],
                "created_at": to_iso(m["created_at"]),
            }
            for m in rows
        ],
    }


@app.route("/api/conversations", methods=["POST"])
def api_start_conversation():
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    data = request.get_json(silent=True) or {}
    item_id = data.get("item_id")
    item = database.query("SELECT * FROM items WHERE id = ?", (item_id,), fetch_one=True)
    if not item:
        return jsonify({"error": "商品不存在"}), 404
    if item["user_id"] == user["id"]:
        return jsonify({"error": "不能与自己的商品发起会话"}), 400
    conv = database.query(
        "SELECT * FROM conversations WHERE item_id = ? AND buyer_id = ?",
        (item_id, user["id"]),
        fetch_one=True,
    )
    if not conv:
        cid = database.execute(
            "INSERT INTO conversations (item_id, buyer_id) VALUES (?, ?)",
            (item_id, user["id"]),
        )
        conv = database.query("SELECT * FROM conversations WHERE id = ?", (cid,), fetch_one=True)
    detail = conversation_detail(conv["id"], user)
    if detail is None:
        return jsonify({"error": "会话不存在"}), 404
    return jsonify(detail)


@app.route("/api/conversations")
def api_conversations():
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    rows = database.query(
        "SELECT c.id, c.item_id, c.buyer_id, c.unread_buyer, c.unread_seller, "
        "c.created_at AS conv_created, i.title AS item_title, i.price AS item_price, "
        "i.images AS item_images, i.user_id AS seller_id, "
        "s.username AS seller_username, b.username AS buyer_username "
        "FROM conversations c "
        "JOIN items i ON i.id = c.item_id "
        "JOIN users s ON s.id = i.user_id "
        "JOIN users b ON b.id = c.buyer_id "
        "WHERE c.buyer_id = ? OR i.user_id = ?",
        (user["id"], user["id"]),
    )
    result = []
    for r in rows:
        last = database.query(
            "SELECT m.text, u.username AS sender, m.created_at "
            "FROM messages m JOIN users u ON u.id = m.sender_id "
            "WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 1",
            (r["id"],),
            fetch_one=True,
        )
        if last:
            updated, last_text, last_sender = last["created_at"], last["text"], last["sender"]
        else:
            updated, last_text, last_sender = r["conv_created"], None, None
        is_buyer = user["id"] == r["buyer_id"]
        images = []
        try:
            images = json.loads(r["item_images"] or "[]")
        except (TypeError, ValueError):
            images = []
        result.append(
            {
                "id": r["id"],
                "item_id": r["item_id"],
                "item_title": r["item_title"],
                "item_price": r["item_price"],
                "item_image": images[0] if images else "",
                "counterpart_is_seller": is_buyer,
                "counterpart": r["seller_username"] if is_buyer else r["buyer_username"],
                "last_message": last_text,
                "last_sender": last_sender,
                "unread": r["unread_buyer"] if is_buyer else r["unread_seller"],
                "updated_at": to_iso(updated),
            }
        )
    result.sort(key=lambda c: c["updated_at"], reverse=True)
    return jsonify(result)


@app.route("/api/conversations/<int:cid>")
def api_get_conversation(cid):
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    detail = conversation_detail(cid, user)
    if detail is None:
        return jsonify({"error": "会话不存在"}), 404
    return jsonify(detail)


@app.route("/api/conversations/<int:cid>/messages", methods=["POST"])
def api_send_message(cid):
    user = current_user()
    if not user:
        return jsonify({"error": "请先登录"}), 401
    conv = database.query("SELECT * FROM conversations WHERE id = ?", (cid,), fetch_one=True)
    if not conv:
        return jsonify({"error": "会话不存在"}), 404
    item = database.query("SELECT user_id FROM items WHERE id = ?", (conv["item_id"],), fetch_one=True)
    if not item:
        return jsonify({"error": "商品不存在"}), 404
    if user["id"] != conv["buyer_id"] and user["id"] != item["user_id"]:
        return jsonify({"error": "无权发送消息"}), 403
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "消息不能为空"}), 400
    if len(text) > 1000:
        return jsonify({"error": "消息过长"}), 400
    mid = database.execute(
        "INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)",
        (cid, user["id"], text),
    )
    if user["id"] == conv["buyer_id"]:
        database.execute("UPDATE conversations SET unread_seller = unread_seller + 1 WHERE id = ?", (cid,))
    else:
        database.execute("UPDATE conversations SET unread_buyer = unread_buyer + 1 WHERE id = ?", (cid,))
    m = database.query(
        "SELECT m.id, m.text, m.created_at, u.username AS sender "
        "FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?",
        (mid,),
        fetch_one=True,
    )
    return jsonify(
        {"id": m["id"], "sender_username": m["sender"], "text": m["text"], "created_at": to_iso(m["created_at"])}
    ), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", debug=os.environ.get("FLASK_DEBUG", "1") == "1", port=port)
