(function () {
    const form = document.getElementById("post-form");
    if (!form) {
        return;
    }

    const MAX_IMAGES = 6;
    const titleInput = document.getElementById("f-title");
    const priceInput = document.getElementById("f-price");
    const locInput = document.getElementById("f-location");
    const catSelect = document.getElementById("f-category");
    const condSelect = document.getElementById("f-condition");
    const descInput = document.getElementById("f-desc");
    const imageList = document.getElementById("image-list");
    const addImageBtn = document.getElementById("add-image");
    const toast = document.getElementById("toast");

    const editId = form.getAttribute("data-edit-id");
    const userEl = document.getElementById("post-user");

    function requireLogin() {
        if (!window.App.currentUser) {
            window.App.loginPrompt(
                document.querySelector(".main"),
                "登录后才能发布或编辑商品"
            );
            form.remove();
            return true;
        }
        return false;
    }

    if (requireLogin()) {
        return;
    }

    if (userEl) {
        userEl.textContent = window.App.currentUser;
    }

    window.App.CATEGORIES.forEach(function (c) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
    });
    window.App.CONDITIONS.forEach(function (c) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        condSelect.appendChild(opt);
    });

    function debounce(fn, ms) {
        let timer = null;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    function addImageRow(value) {
        if (imageList.querySelectorAll(".img-row").length >= MAX_IMAGES) {
            return;
        }
        const row = document.createElement("div");
        row.className = "img-row";

        const input = document.createElement("input");
        input.type = "url";
        input.className = "img-url";
        input.placeholder = "https://图片地址.jpg";
        input.value = value || "";

        const preview = document.createElement("div");
        preview.className = "img-preview";

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "img-remove";
        remove.textContent = "移除";
        remove.addEventListener("click", function () {
            row.remove();
        });

        function renderPreview() {
            const url = input.value.trim();
            preview.innerHTML = "";
            if (!url) {
                return;
            }
            const img = document.createElement("img");
            img.src = url;
            img.alt = "图片预览";
            img.loading = "lazy";
            window.App.bindImageError(img);
            preview.appendChild(img);
        }

        input.addEventListener("input", debounce(renderPreview, 400));

        row.appendChild(input);
        row.appendChild(preview);
        row.appendChild(remove);
        imageList.appendChild(row);
        renderPreview();
    }

    addImageBtn.addEventListener("click", function () {
        addImageRow("");
    });
    addImageRow("");

    function getImages() {
        const urls = [];
        imageList.querySelectorAll(".img-url").forEach(function (i) {
            const v = i.value.trim();
            if (v) {
                urls.push(v);
            }
        });
        return urls;
    }

    function setError(key, msg) {
        const el = form.querySelector('.field-error[data-for="' + key + '"]');
        if (!el) {
            return;
        }
        if (msg) {
            el.textContent = msg;
            el.classList.remove("hidden");
        } else {
            el.textContent = "";
            el.classList.add("hidden");
        }
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add("show");
        setTimeout(function () {
            toast.classList.remove("show");
        }, 1800);
    }

    function handleAuthError(err) {
        if (err.status === 401) {
            window.App.redirectToLogin(location.pathname);
            return true;
        }
        return false;
    }

    async function initEdit() {
        let item;
        try {
            item = await window.App.getItem(editId);
        } catch (err) {
            form.remove();
            document.querySelector(".main").innerHTML =
                '<div class="empty-state"><h2>商品不存在</h2>' +
                '<a class="btn" href="/profile">返回个人中心</a></div>';
            return;
        }
        if (!window.App.currentUser || item.seller !== window.App.currentUser) {
            form.remove();
            document.querySelector(".main").innerHTML =
                '<div class="empty-state"><h2>无权编辑该商品</h2>' +
                "<p>只能编辑自己发布的商品</p>" +
                '<a class="btn" href="/profile">返回个人中心</a></div>';
            return;
        }
        titleInput.value = item.title;
        priceInput.value = item.price;
        locInput.value = item.location;
        descInput.value = item.description || "";
        catSelect.value = item.category;
        condSelect.value = item.condition;
        const firstRow = imageList.querySelector(".img-row");
        if (firstRow) {
            firstRow.remove();
        }
        if (item.images && item.images.length) {
            item.images.forEach(function (src) {
                addImageRow(src);
            });
        } else {
            addImageRow("");
        }
        document.getElementById("submit-btn").textContent = "保存修改";
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const title = titleInput.value.trim();
        const price = priceInput.value.trim();
        const loc = locInput.value.trim();
        const priceNum = Number(price);
        let ok = true;

        if (!title) {
            setError("title", "请填写商品标题");
            ok = false;
        } else {
            setError("title", "");
        }
        if (!price || isNaN(priceNum) || priceNum <= 0) {
            setError("price", "请填写大于 0 的价格");
            ok = false;
        } else {
            setError("price", "");
        }
        if (!loc) {
            setError("location", "请填写所在地区");
            ok = false;
        } else {
            setError("location", "");
        }
        if (!ok) {
            return;
        }

        const body = {
            title: title,
            price: priceNum,
            category: catSelect.value,
            condition: condSelect.value,
            location: loc,
            description: descInput.value.trim(),
            images: getImages()
        };

        try {
            if (editId) {
                await window.App.updateItem(editId, body);
                showToast("已保存修改");
                setTimeout(function () {
                    location.href = "/profile";
                }, 1200);
            } else {
                const item = await window.App.createItem(body);
                showToast("发布成功，商品已上架");
                setTimeout(function () {
                    location.href = "/item/" + item.id;
                }, 1200);
            }
        } catch (err) {
            if (handleAuthError(err)) {
                return;
            }
            if (err.status === 403) {
                setError("title", "只能编辑自己发布的商品");
                return;
            }
            showToast(err.message);
        }
    });

    if (editId) {
        initEdit();
    }
})();
