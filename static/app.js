window.App = {
    CATEGORIES: ["数码电子", "服饰鞋包", "图书教材", "运动户外", "生活家居", "文娱乐器", "其他"],
    CONDITIONS: ["全新", "九成新", "八成新", "七成新", "明显使用痕迹"],

    currentUser: null,

    init() {
        const meta = document.querySelector('meta[name="user"]');
        this.currentUser = meta && meta.content ? meta.content : null;
    },

    async api(url, options) {
        const res = await fetch(url, {
            headers: { "Content-Type": "application/json" },
            ...options
        });
        let data = null;
        try {
            data = await res.json();
        } catch (e) {
            data = null;
        }
        if (!res.ok) {
            const err = new Error((data && data.error) || ("请求失败 (" + res.status + ")"));
            err.status = res.status;
            throw err;
        }
        return data;
    },

    loginUrl(next) {
        return "/login?next=" + encodeURIComponent(next || "/");
    },

    redirectToLogin(next) {
        location.href = this.loginUrl(next || location.pathname + location.search);
    },

    async getItems(params) {
        const q = new URLSearchParams(params || {}).toString();
        return this.api("/api/items" + (q ? "?" + q : ""));
    },

    getItem(id) {
        return this.api("/api/items/" + id);
    },

    createItem(body) {
        return this.api("/api/items", { method: "POST", body: JSON.stringify(body) });
    },

    updateItem(id, body) {
        return this.api("/api/items/" + id, { method: "PUT", body: JSON.stringify(body) });
    },

    startConversation(itemId) {
        return this.api("/api/conversations", {
            method: "POST",
            body: JSON.stringify({ item_id: itemId })
        });
    },

    getConversations() {
        return this.api("/api/conversations");
    },

    getConversation(cid) {
        return this.api("/api/conversations/" + cid);
    },

    sendMessage(cid, text) {
        return this.api("/api/conversations/" + cid + "/messages", {
            method: "POST",
            body: JSON.stringify({ text: text })
        });
    },

    async updateBadge() {
        let total = 0;
        try {
            const convs = await this.getConversations();
            total = convs.reduce(function (s, c) {
                return s + (Number(c.unread) || 0);
            }, 0);
        } catch (e) {
            total = 0;
        }
        document.querySelectorAll("[data-msg-badge]").forEach(function (el) {
            if (total > 0) {
                el.textContent = total > 99 ? "99+" : String(total);
                el.classList.remove("hidden");
            } else {
                el.classList.add("hidden");
            }
        });
    },

    escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = String(str === undefined || str === null ? "" : str);
        return div.innerHTML;
    },

    formatPrice(price) {
        const n = Number(price) || 0;
        return Number.isInteger(n) ? String(n) : n.toFixed(2);
    },

    timeAgo(dateStr) {
        const t = new Date(dateStr).getTime();
        if (isNaN(t)) {
            return "";
        }
        const diff = Math.max(0, Date.now() - t);
        const min = Math.floor(diff / 60000);
        if (min < 1) {
            return "刚刚";
        }
        if (min < 60) {
            return min + " 分钟前";
        }
        const hr = Math.floor(min / 60);
        if (hr < 24) {
            return hr + " 小时前";
        }
        const day = Math.floor(hr / 24);
        if (day < 30) {
            return day + " 天前";
        }
        const d = new Date(t);
        return (
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(d.getDate()).padStart(2, "0")
        );
    },

    bindImageError(img) {
        img.addEventListener("error", function () {
            const fb = document.createElement("div");
            fb.className = "img-fallback";
            fb.textContent = img.getAttribute("data-label") || "闲置市场";
            if (img.parentNode) {
                img.parentNode.replaceChild(fb, img);
            }
        });
    },

    loginPrompt(target, text) {
        target.innerHTML =
            '<div class="empty-state">' +
            "<h2>请先登录</h2>" +
            "<p>" + (text || "登录后即可使用此功能") + "</p>" +
            '<a class="btn" href="' +
            this.loginUrl(location.pathname + location.search) +
            '">去登录</a>' +
            '<a class="btn btn-ghost-btn" href="/register">注册</a>' +
            "</div>";
    }
};

document.addEventListener("DOMContentLoaded", function () {
    window.App.init();
    window.App.updateBadge();
});
