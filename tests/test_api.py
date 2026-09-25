import pytest

from app import app


@pytest.fixture()
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def register(client, username):
    return client.post("/api/register", json={"username": username, "password": "secret123"})


def make_item_body():
    return {
        "title": "测试键盘",
        "price": 99,
        "category": "数码电子",
        "condition": "九成新",
        "location": "北京",
        "description": "描述",
        "images": ["https://example.com/a.jpg"],
    }


def test_pages_render(client):
    for path in ["/", "/item/1", "/post", "/messages", "/profile", "/login", "/register", "/chat/1"]:
        assert client.get(path).status_code == 200, path


def test_seed_items_visible_without_login(client):
    r = client.get("/api/items")
    assert r.status_code == 200
    items = r.get_json()
    assert len(items) == 12
    assert all(it["status"] == "active" for it in items)


def test_register_login_logout(client):
    r = register(client, "user_auth")
    assert r.status_code == 201
    r = client.post("/api/login", json={"username": "user_auth", "password": "secret123"})
    assert r.status_code == 200
    r = client.post("/api/login", json={"username": "user_auth", "password": "wrong"})
    assert r.status_code == 401
    client.get("/logout")
    r = client.post("/api/login", json={"username": "user_auth", "password": "secret123"})
    assert r.status_code == 200


def test_register_validation(client):
    assert register(client, "u").status_code == 400
    assert register(client, "user_badpass").status_code == 201


def test_create_item_requires_login(client):
    r = client.post("/api/items", json=make_item_body())
    assert r.status_code == 401


def test_create_item_and_list(client):
    register(client, "user_seller1")
    r = client.post("/api/items", json=make_item_body())
    assert r.status_code == 201
    item = r.get_json()
    assert item["id"] is not None
    assert item["seller"] == "user_seller1"

    r = client.get("/api/items?search=" + "键盘")
    assert r.status_code == 200
    assert len(r.get_json()) >= 1

    r = client.get("/api/items?category=" + "数码电子")
    assert r.status_code == 200
    assert all(it["category"] == "数码电子" for it in r.get_json())

    r = client.get("/api/items?mine=1")
    assert r.status_code == 200
    assert len(r.get_json()) >= 1


def test_update_item_ownership(client):
    register(client, "user_owner1")
    body = make_item_body()
    body["title"] = "唯一标题_owner1"
    item = client.post("/api/items", json=body).get_json()
    register(client, "user_intruder")
    r = client.put(f"/api/items/{item['id']}", json={"status": "removed"})
    assert r.status_code == 403
    client.get("/logout")
    client.post("/api/login", json={"username": "user_owner1", "password": "secret123"})
    r = client.put(f"/api/items/{item['id']}", json={"status": "removed"})
    assert r.status_code == 200
    assert r.get_json()["status"] == "removed"
    r = client.get(f"/api/items/{item['id']}")
    assert r.get_json()["status"] == "removed"
    assert client.get("/api/items?mine=1").get_json()[0]["status"] == "removed"
    assert client.get("/api/items?search=" + "唯一标题_owner1").get_json() == []


def test_edit_item(client):
    register(client, "user_editor")
    item = client.post("/api/items", json=make_item_body()).get_json()
    body = make_item_body()
    body["price"] = 150
    r = client.put(f"/api/items/{item['id']}", json=body)
    assert r.status_code == 200
    assert r.get_json()["price"] == 150


def test_conversation_flow(client):
    register(client, "buyer_conv")
    r = client.post("/api/conversations", json={"item_id": 1})
    assert r.status_code == 200
    conv = r.get_json()
    cid = conv["id"]
    assert conv["item"]["id"] == 1
    assert conv["buyer_username"] == "buyer_conv"
    assert conv["seller_username"] == "阿橙"

    r = client.post(f"/api/conversations/{cid}/messages", json={"text": "你好"})
    assert r.status_code == 201
    assert r.get_json()["sender_username"] == "buyer_conv"

    r = client.get("/api/conversations")
    data = r.get_json()
    assert len(data) == 1
    assert data[0]["unread"] == 0
    assert data[0]["counterpart"] == "阿橙"
    assert data[0]["last_message"] == "你好"

    r = client.post("/api/conversations", json={"item_id": 1})
    assert r.get_json()["id"] == cid


def test_seller_view_unread(client):
    register(client, "buyer_sell")
    cid = client.post("/api/conversations", json={"item_id": 1}).get_json()["id"]
    client.post(f"/api/conversations/{cid}/messages", json={"text": "hi"})

    client.get("/logout")
    r = client.post("/api/login", json={"username": "阿橙", "password": "demo123"})
    assert r.status_code == 200
    data = client.get("/api/conversations").get_json()
    conv = next((c for c in data if c["id"] == cid), None)
    assert conv is not None
    assert conv["unread"] == 1
    assert conv["counterpart"] == "buyer_sell"
    assert conv["counterpart_is_seller"] is False

    r = client.get(f"/api/conversations/{cid}")
    assert r.status_code == 200
    assert r.get_json()["buyer_username"] == "buyer_sell"
    data = client.get("/api/conversations").get_json()
    conv = next((c for c in data if c["id"] == cid), None)
    assert conv["unread"] == 0

    r = client.post(f"/api/conversations/{cid}/messages", json={"text": "回复"})
    assert r.status_code == 201

    client.get("/logout")
    client.post("/api/login", json={"username": "buyer_sell", "password": "secret123"})
    data = client.get("/api/conversations").get_json()
    conv = next((c for c in data if c["id"] == cid), None)
    assert conv["unread"] == 1
