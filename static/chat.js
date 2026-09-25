(function () {
    const root = document.getElementById("chat-root");
    if (!root) {
        return;
    }

    const itemId = root.getAttribute("data-item-id");
    const convId = root.getAttribute("data-conv-id");

    async function loadConversation() {
        if (convId) {
            return window.App.getConversation(convId);
        }
        if (!window.App.currentUser) {
            window.App.loginPrompt(root, "登录后即可联系卖家");
            return null;
        }
        try {
            return await window.App.startConversation(itemId);
        } catch (err) {
            if (err.status === 401) {
                window.App.loginPrompt(root, "登录后即可联系卖家");
                return null;
            }
            if (err.status === 400) {
                root.innerHTML =
                    '<div class="empty-state">' +
                    "<h2>无法发起会话</h2>" +
                    "<p>" + window.App.escapeHtml(err.message) + "</p>" +
                    '<a class="btn" href="/item/' +
                    itemId +
                    '">返回商品</a>' +
                    "</div>";
                return null;
            }
            root.innerHTML =
                '<div class="empty-state">' +
                "<h2>加载失败</h2>" +
                "<p>" + window.App.escapeHtml(err.message) + "</p>" +
                "</div>";
            return null;
        }
    }

    async function render() {
        const conv = await loadConversation();
        if (!conv) {
            return;
        }

        const item = conv.item;
        const me = window.App.currentUser;
        const isBuyer = me === conv.buyer_username;
        const counterpart = isBuyer ? conv.seller_username : conv.buyer_username;

        root.innerHTML =
            '<div class="chat-head">' +
            '<a class="chat-back" href="/item/' +
            item.id +
            '">返回商品</a>' +
            '<div class="chat-title">与 ' +
            window.App.escapeHtml(counterpart) +
            " 的会话</div>" +
            "</div>" +
            '<a class="chat-item-summary" href="/item/' +
            item.id +
            '">' +
            '<img src="' +
            (item.images && item.images[0]
                ? window.App.escapeHtml(item.images[0])
                : "") +
            '" alt="' +
            window.App.escapeHtml(item.title) +
            '" data-label="' +
            window.App.escapeHtml(item.category) +
            '">' +
            '<div class="chat-item-info">' +
            '<div class="t">' +
            window.App.escapeHtml(item.title) +
            "</div>" +
            '<div class="p">¥' +
            window.App.formatPrice(item.price) +
            "</div>" +
            "</div>" +
            "</a>" +
            '<div class="chat-notice">本平台仅提供沟通，交易请在线下或平台外完成，注意甄别真伪、保障安全。</div>' +
            '<div class="chat-messages" id="chat-messages"></div>' +
            '<div class="chat-input">' +
            '<textarea id="chat-text" rows="1" placeholder="输入消息…"></textarea>' +
            '<button type="button" class="chat-send" id="chat-send">发送</button>' +
            "</div>";

        const msgWrap = document.getElementById("chat-messages");
        const text = document.getElementById("chat-text");
        const sendBtn = document.getElementById("chat-send");

        const summaryImg = root.querySelector(".chat-item-summary img");
        if (summaryImg) {
            window.App.bindImageError(summaryImg);
        }

        function msgTime(iso) {
            const d = new Date(iso);
            if (isNaN(d.getTime())) {
                return "";
            }
            const pad = function (n) {
                return String(n).padStart(2, "0");
            };
            return pad(d.getHours()) + ":" + pad(d.getMinutes());
        }

        function renderMessages() {
            msgWrap.innerHTML = "";
            if (!conv.messages.length) {
                const tip = document.createElement("div");
                tip.className = "msg-tip";
                tip.textContent = "还没有消息，打个招呼开始询价吧";
                msgWrap.appendChild(tip);
                return;
            }
            conv.messages.forEach(function (m) {
                const bubble = document.createElement("div");
                bubble.className = "msg " + (m.sender_username === me ? "mine" : "theirs");
                const span = document.createElement("span");
                span.textContent = m.text;
                bubble.appendChild(span);
                const time = document.createElement("span");
                time.className = "msg-time";
                time.textContent = msgTime(m.created_at);
                bubble.appendChild(time);
                msgWrap.appendChild(bubble);
            });
            msgWrap.scrollTop = msgWrap.scrollHeight;
        }

        async function send() {
            const value = text.value.trim();
            if (!value) {
                return;
            }
            try {
                const m = await window.App.sendMessage(conv.id, value);
                conv.messages.push(m);
            } catch (err) {
                if (err.status === 401) {
                    window.App.redirectToLogin(location.pathname);
                    return;
                }
                return;
            }
            text.value = "";
            renderMessages();
            window.App.updateBadge();
        }

        sendBtn.addEventListener("click", send);
        text.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
        text.addEventListener("input", function () {
            text.style.height = "auto";
            text.style.height = Math.min(text.scrollHeight, 96) + "px";
        });

        renderMessages();
    }

    render();
})();
