(function () {
    const state = { keyword: "", category: "全部" };
    const grid = document.getElementById("item-grid");
    const empty = document.getElementById("empty-state");
    const searchInput = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear");
    const catBar = document.getElementById("category-bar");
    const resetBtn = document.getElementById("reset-filters");

    if (!grid) {
        return;
    }

    function renderCategories() {
        const cats = ["全部"].concat(window.App.CATEGORIES);
        catBar.innerHTML = "";
        cats.forEach(function (c) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "cat-chip" + (c === state.category ? " active" : "");
            chip.textContent = c;
            chip.addEventListener("click", function () {
                state.category = c;
                renderCategories();
                renderItems();
            });
            catBar.appendChild(chip);
        });
    }

    function showError(msg) {
        grid.innerHTML = "";
        grid.classList.add("hidden");
        empty.classList.remove("hidden");
        empty.querySelector("h2").textContent = "加载失败";
        empty.querySelector("p").textContent = msg || "请稍后重试";
        resetBtn.classList.add("hidden");
    }

    async function renderItems() {
        const params = {};
        if (state.keyword.trim()) {
            params.search = state.keyword.trim();
        }
        if (state.category !== "全部") {
            params.category = state.category;
        }
        let items;
        try {
            items = await window.App.getItems(params);
        } catch (err) {
            showError(err.message);
            return;
        }
        grid.innerHTML = "";
        if (items.length === 0) {
            grid.classList.add("hidden");
            empty.classList.remove("hidden");
            empty.querySelector("h2").textContent = "没有找到相关商品";
            empty.querySelector("p").textContent = "换个关键词或分类再试试";
            resetBtn.classList.remove("hidden");
            return;
        }
        grid.classList.remove("hidden");
        empty.classList.add("hidden");
        resetBtn.classList.remove("hidden");
        items.forEach(function (it) {
            grid.appendChild(card(it));
        });
    }

    function card(it) {
        const a = document.createElement("a");
        a.className = "item-card";
        a.href = "/item/" + it.id;

        const cover = document.createElement("div");
        cover.className = "item-cover";
        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = it.title;
        img.src = it.images && it.images[0] ? it.images[0] : "";
        img.setAttribute("data-label", it.category);
        window.App.bindImageError(img);
        cover.appendChild(img);
        const cat = document.createElement("span");
        cat.className = "item-cat";
        cat.textContent = it.category;
        cover.appendChild(cat);

        const body = document.createElement("div");
        body.className = "item-body";

        const title = document.createElement("div");
        title.className = "item-title";
        title.textContent = it.title;

        const price = document.createElement("div");
        price.className = "item-price";
        price.textContent = "¥" + window.App.formatPrice(it.price);

        const meta = document.createElement("div");
        meta.className = "item-meta";
        meta.textContent =
            (it.condition || "") + (it.location ? " · " + it.location : "");

        const time = document.createElement("div");
        time.className = "item-time";
        time.textContent = window.App.timeAgo(it.created_at) + " 发布";

        body.appendChild(title);
        body.appendChild(price);
        body.appendChild(meta);
        body.appendChild(time);

        a.appendChild(cover);
        a.appendChild(body);
        return a;
    }

    searchInput.addEventListener("input", function () {
        state.keyword = searchInput.value;
        clearBtn.classList.toggle("hidden", !state.keyword);
        renderItems();
    });

    clearBtn.addEventListener("click", function () {
        searchInput.value = "";
        state.keyword = "";
        clearBtn.classList.add("hidden");
        renderItems();
    });

    resetBtn.addEventListener("click", function () {
        searchInput.value = "";
        state.keyword = "";
        state.category = "全部";
        clearBtn.classList.add("hidden");
        renderCategories();
        renderItems();
    });

    renderCategories();
    renderItems();
})();
