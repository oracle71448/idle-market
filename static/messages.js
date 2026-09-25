(function () {
    const list = document.getElementById("conv-list");
    const empty = document.getElementById("conv-empty");
    if (!list) {
        return;
    }

    function relativeTime(iso) {
        const t = new Date(iso).getTime();
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
        if (day < 7) {
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
    }

    async function render() {
        if (!window.App.currentUser) {
            list.classList.add("hidden");
            empty.classList.remove("hidden");
            empty.querySelector("h2").textContent = "请先登录";
            empty.querySelector("p").textContent = "登录后查看你的会话";
            const btn = empty.querySelector(".btn");
            btn.textContent = "去登录";
            btn.href = window.App.loginUrl("/messages");
            return;
        }

        let convs;
        try {
            convs = await window.App.getConversations();
        } catch (err) {
            list.classList.add("hidden");
            empty.classList.remove("hidden");
            empty.querySelector("h2").textContent = "加载失败";
            empty.querySelector("p").textContent = err.message;
            return;
        }

        list.innerHTML = "";
        if (convs.length === 0) {
            list.classList.add("hidden");
            empty.classList.remove("hidden");
            empty.querySelector("h2").textContent = "暂无会话";
            empty.querySelector("p").textContent = "从商品详情页点击\"联系卖家\"即可发起会话";
            const btn = empty.querySelector(".btn");
            btn.textContent = "去逛逛";
            btn.href = "/";
            return;
        }
        list.classList.remove("hidden");
        empty.classList.add("hidden");

        convs.forEach(function (c) {
            const a = document.createElement("a");
            a.className = "conv-item";
            a.href = "/chat/conv/" + c.id;

            const preview = c.last_message
                ? c.last_sender + "：" + c.last_message
                : "还没有消息，打个招呼吧";
            const unread = Number(c.unread) || 0;
            const counterpart = c.counterpart || "";

            const avatar = document.createElement("div");
            avatar.className = "conv-avatar";
            avatar.textContent = (counterpart || "?").charAt(0);

            const main = document.createElement("div");
            main.className = "conv-main";

            const top = document.createElement("div");
            top.className = "conv-top";
            const name = document.createElement("span");
            name.className = "conv-name";
            name.textContent = counterpart;
            const time = document.createElement("span");
            time.className = "conv-time";
            time.textContent = relativeTime(c.updated_at);
            top.appendChild(name);
            top.appendChild(time);

            const sum = document.createElement("div");
            sum.className = "conv-item-sum";
            sum.textContent =
                (c.item_title || "商品") + " · ¥" + window.App.formatPrice(c.item_price);

            const prev = document.createElement("div");
            prev.className = "conv-preview";
            prev.textContent = preview;

            main.appendChild(top);
            main.appendChild(sum);
            main.appendChild(prev);

            a.appendChild(avatar);
            a.appendChild(main);

            if (unread > 0) {
                const badge = document.createElement("span");
                badge.className = "conv-unread";
                badge.textContent = unread > 99 ? "99+" : String(unread);
                a.appendChild(badge);
            }

            list.appendChild(a);
        });
    }

    render();
})();
