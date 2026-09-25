(function () {
    const listEl = document.getElementById("my-items");
    const emptyEl = document.getElementById("my-empty");
    const statsEl = document.querySelector(".profile-stats");
    if (!listEl) {
        return;
    }

    function statusBadge(status) {
        if (status === "removed") {
            return '<span class="status-badge removed">已下架</span>';
        }
        return '<span class="status-badge active">在售</span>';
    }

    function card(it, onClick) {
        const div = document.createElement("div");
        div.className = "my-item";

        const cover = document.createElement("div");
        cover.className = "my-item-cover";
        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = it.title;
        img.src = it.images && it.images[0] ? it.images[0] : "";
        img.setAttribute("data-label", it.category);
        window.App.bindImageError(img);
        cover.appendChild(img);

        const info = document.createElement("div");
        info.className = "my-item-info";
        const title = document.createElement("div");
        title.className = "my-item-title";
        title.textContent = it.title;
        const price = document.createElement("div");
        price.className = "my-item-price";
        price.textContent = "¥" + window.App.formatPrice(it.price);
        const meta = document.createElement("div");
        meta.className = "my-item-meta";
        meta.textContent =
            it.category +
            " · " +
            (it.condition || "") +
            " · " +
            window.App.timeAgo(it.created_at) +
            " 发布";
        info.appendChild(title);
        info.appendChild(price);
        info.appendChild(meta);
        info.innerHTML += statusBadge(it.status);

        const actions = document.createElement("div");
        actions.className = "my-item-actions";
        const editLink = document.createElement("a");
        editLink.className = "btn-small";
        editLink.href = "/edit/" + it.id;
        editLink.textContent = "编辑";
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "btn-small ghost";
        toggle.textContent = it.status === "removed" ? "重新上架" : "下架";
        toggle.addEventListener("click", function () {
            onClick(it);
        });
        actions.appendChild(editLink);
        actions.appendChild(toggle);

        div.appendChild(cover);
        div.appendChild(info);
        div.appendChild(actions);
        return div;
    }

    async function render() {
        if (!window.App.currentUser) {
            listEl.classList.add("hidden");
            emptyEl.classList.remove("hidden");
            statsEl.classList.add("hidden");
            document.querySelector(".profile-card").classList.add("hidden");
            document.querySelector(".section-title").classList.add("hidden");
            emptyEl.innerHTML =
                "<h2>请先登录</h2>" +
                "<p>登录后查看你的资料与商品</p>" +
                '<a class="btn" href="' + window.App.loginUrl("/profile") + '">去登录</a>';
            return;
        }

        document.getElementById("pf-name").textContent = window.App.currentUser;
        document.getElementById("pf-avatar").textContent = window.App.currentUser.charAt(0);

        let items;
        try {
            items = await window.App.getItems({ mine: "1" });
        } catch (err) {
            listEl.classList.add("hidden");
            emptyEl.classList.remove("hidden");
            emptyEl.innerHTML = "<h2>加载失败</h2><p>" + window.App.escapeHtml(err.message) + "</p>";
            return;
        }

        const active = items.filter(function (it) {
            return it.status !== "removed";
        }).length;
        const removed = items.length - active;

        document.getElementById("pf-stat-active").textContent = active;
        document.getElementById("pf-stat-removed").textContent = removed;
        document.getElementById("pf-stat-total").textContent = items.length;

        listEl.innerHTML = "";
        if (items.length === 0) {
            listEl.classList.add("hidden");
            emptyEl.classList.remove("hidden");
            emptyEl.innerHTML =
                "<h2>还没有发布商品</h2>" +
                "<p>去发布你的第一件闲置吧</p>" +
                '<a class="btn" href="/post">去发布</a>';
            return;
        }
        listEl.classList.remove("hidden");
        emptyEl.classList.add("hidden");

        items.forEach(function (it) {
            listEl.appendChild(
                card(it, async function (target) {
                    try {
                        await window.App.updateItem(target.id, {
                            status: target.status === "removed" ? "active" : "removed"
                        });
                        render();
                    } catch (err) {
                        alert(err.message);
                    }
                })
            );
        });
    }

    render();
})();
