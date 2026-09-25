(function () {
    const form = document.getElementById("login-form") || document.getElementById("register-form");
    if (!form) {
        return;
    }
    const isLogin = !!document.getElementById("login-form");
    const url = isLogin ? "/api/login" : "/api/register";
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const errorEl = document.getElementById("auth-error");

    function setError(msg) {
        if (msg) {
            errorEl.textContent = msg;
            errorEl.classList.remove("hidden");
        } else {
            errorEl.textContent = "";
            errorEl.classList.add("hidden");
        }
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const name = username.value.trim();
        const pwd = password.value;
        setError("");

        if (!name) {
            setError("请输入用户名");
            return;
        }
        if (!isLogin && pwd.length < 6) {
            setError("密码至少 6 位");
            return;
        }

        try {
            await window.App.api(url, {
                method: "POST",
                body: JSON.stringify({ username: name, password: pwd })
            });
            const next = form.getAttribute("data-next") || "/";
            location.href = next;
        } catch (err) {
            setError(err.message);
        }
    });
})();
