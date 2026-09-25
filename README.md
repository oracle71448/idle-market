# 闲置市场

一个参考闲鱼的闲置物品**发现与交流**网站。平台仅提供商品展示与沟通，交易由用户自行在线下或平台外完成。

## 技术栈

- Python / Flask（Session 登录认证）
- SQLite（商品、用户、会话、消息持久化，多用户共享）
- HTML / CSS / Vanilla JavaScript（fetch 调用 JSON API）
- Pytest（API 测试）

## 功能

- 浏览 / 搜索 / 分类筛选商品（仅展示"在售"）
- 商品详情、卖家信息、联系卖家
- 注册 / 登录 / 退出（登录后才能发布、编辑、发消息）
- 发布 / 编辑 / 下架 / 重新上架自己的商品（个人中心）
- 询价会话：从商品详情发起（同一商品同一买家复用同一会话），买卖双方收发文本消息
- 未读提示：导航"消息"徽标 + 会话列表未读红标，打开会话自动已读
- 响应式：桌面顶部导航 / 手机底部标签栏

## 运行

```bash
pip install -r requirements.txt
python app.py
```

打开 <http://127.0.0.1:5000>

> 首次启动自动建库并写入 12 条演示商品（见下方演示账号）。

## 演示账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 卖家（拥有 12 条演示商品） | 阿橙 | demo123 |

可用"注册"创建自己的账号体验完整流程。

## 测试

```bash
pytest
```

测试使用独立临时数据库，不影响开发数据。

## 页面与 API

页面：`/`（发现）、`/item/<id>`（详情）、`/post`（发布）、`/edit/<id>`（编辑）、`/messages`（消息列表）、`/chat/<id>`（按商品发起会话）、`/chat/conv/<cid>`（按会话打开）、`/profile`（个人中心）、`/login`、`/register`

API（JSON）：
- `POST /api/register`、`POST /api/login`、`GET /logout`
- `GET /api/items`（`search`/`category`/`mine`）、`GET /api/items/<id>`、`POST /api/items`、`PUT /api/items/<id>`（编辑或改 status）
- `POST /api/conversations`（按商品发起/复用会话）、`GET /api/conversations`（当前用户会话列表）、`GET /api/conversations/<cid>`（详情，自动已读）、`POST /api/conversations/<cid>/messages`

## 部署到公网（Render 等）

项目已含 `Procfile`（`web: gunicorn app:app`）、`requirements.txt` 与 `render.yaml`（Render 蓝图）。以 Render 为例：

1. 将本目录推送到 GitHub（.gitignore 已排除数据库与日志）
2. Render 新建 **Blueprint**（导入 `render.yaml`）或新建 **Web Service**，Start Command 填 `gunicorn app:app`
3. 环境变量：`SECRET_KEY`（必填，用于会话签名；`render.yaml` 会自动生成随机值）
4. 部署后所有人通过网址访问

> **数据持久化注意**：本项目使用 SQLite 单文件数据库。Render 免费版的文件系统是临时的，服务重启/重新部署后数据会重置。若要长期保存数据，建议改用 Render 的 Postgres（需把 `database.py` 的连接改为 psycopg2 并对 SQL 做少量适配），或使用带持久磁盘的付费方案。

## 说明与限制

- 简单注册登录（用户名+密码+Session），无邮箱验证、找回密码
- 图片为 URL（外链），无上传服务；外链失效时显示分类占位图
- 消息为异步文本（写入数据库），无实时推送、无图片/语音消息
- 无支付、订单、物流、担保交易——交易完全在线下或平台外完成
