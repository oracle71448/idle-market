(function () {
    const root = document.getElementById("detail-root");
    if (!root) {
        return;
    }

    const itemId = root.getAttribute("data-item-id");

    async function render() {
        let item;
        try {
            item = await window.App.getItem(itemId);
        } catch (err) {
            root.innerHTML =
                '<div class="empty-state">' +
                "<h2>商品不存在或已下架</h2>" +
                "<p>" + window.App.escapeHtml(err.message) + "</p>" +
                '<a class="btn" href="/">返回发现页</a>' +
                "</div>";
            return;
        }

        const images = item.images && item.images.length ? item.images : [""];
        const count = item.seller_item_count || 0;
        const isMine = window.App.currentUser === item.seller;
        const canContact = item.status !== "removed";

        let mainImg = "";
        if (images[0]) {
            mainImg =
                '<img src="' +
                window.App.escapeHtml(images[0]) +
                '" alt="' +
                window.App.escapeHtml(item.title) +
                '" data-label="' +
                window.App.escapeHtml(item.category) +
                '" id="detail-main-img">';
        }

        let thumbs = "";
        if (images.length > 1) {
            thumbs =
                '<div class="detail-thumbs">' +
                images
                    .map(function (src, i) {
                        return (
                            '<button type="button" class="detail-thumb" data-src="' +
                            window.App.escapeHtml(src) +
                            '">' +
                            "<img src=\"" +
                            window.App.escapeHtml(src) +
                            '" alt="缩略图' +
                            (i + 1) +
                            '" loading="lazy"></button>'
                        );
                    })
                    .join("") +
                "</div>";
        }

        let contact = "";
        if (!canContact) {
            contact = '<span class="btn btn-contact btn-disabled">已下架</span>';
        } else if (isMine) {
            contact = '<a class="btn btn-contact" href="/edit/' + item.id + '">编辑商品</a>';
        } else if (!window.App.currentUser) {
            contact =
                '<a class="btn btn-contact" href="' +
                window.App.loginUrl("/item/" + item.id) +
                '">登录后联系卖家</a>';
        } else {
            contact = '<a class="btn btn-contact" href="/chat/' + item.id + '">联系卖家</a>';
        }

        root.innerHTML =
            '<div class="detail-gallery">' +
            '<div class="detail-img-main">' +
            mainImg +
            "</div>" +
            thumbs +
            "</div>" +
            '<div class="detail-card">' +
            '<div class="detail-price">¥' +
            window.App.formatPrice(item.price) +
            "</div>" +
            '<h1 class="detail-title">' +
            window.App.escapeHtml(item.title) +
            "</h1>" +
            '<div class="detail-tags">' +
            "<span>" +
            window.App.escapeHtml(item.condition || "未标注成色") +
            "</span>" +
            "<span>" +
            window.App.escapeHtml(item.category) +
            "</span>" +
            (item.status === "removed"
                ? '<span class="tag-removed">已下架</span>'
                : "") +
            "</div>" +
            '<div class="detail-meta">' +
            window.App.escapeHtml(item.location || "地点未填写") +
            " · " +
            window.App.timeAgo(item.created_at) +
            " 发布" +
            "</div>" +
            "</div>" +
            '<div class="detail-card">' +
            "<h2>宝贝描述</h2>" +
            "<p>" +
            (item.description
                ? window.App.escapeHtml(item.description)
                : "卖家没有填写描述，可以直接联系询问。") +
            "</p>" +
            "</div>" +
            '<div class="detail-card seller-card">' +
            '<div class="seller-avatar">' +
            window.App.escapeHtml((item.seller || "?").charAt(0)) +
            "</div>" +
            '<div class="seller-info">' +
            '<div class="seller-name">' +
            window.App.escapeHtml(item.seller) +
            "</div>" +
            '<div class="seller-sub">卖家 · 已发布 ' +
            count +
            " 件闲置</div>" +
            "</div>" +
            contact +
            "</div>" +
            '<div class="platform-notice">' +
            "<strong>温馨提示：</strong>本平台仅提供商品展示与沟通，交易由买卖双方自行在线下或平台外完成，请注意甄别真伪、当面验货、保障安全。" +
            "</div>";

        const main = document.getElementById("detail-main-img");
        if (main) {
            window.App.bindImageError(main);
        }

        root.querySelectorAll(".detail-thumb").forEach(function (btn) {
            const img = btn.querySelector("img");
            if (img) {
                window.App.bindImageError(img);
            }
            btn.addEventListener("click", function () {
                const mainEl = document.getElementById("detail-main-img");
                if (mainEl) {
                    mainEl.src = btn.getAttribute("data-src");
                }
            });
        });
    }

    render();
})();
