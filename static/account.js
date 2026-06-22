const state = {
    user: JSON.parse(localStorage.getItem("theaterUser") || "null"),
};

const els = {
    status: document.getElementById("accountStatus"),
    login: document.getElementById("accountLogin"),
    content: document.getElementById("accountContent"),
    summary: document.getElementById("accountSummary"),
    bookings: document.getElementById("accountBookings"),
    form: document.getElementById("accountAuthForm"),
    loginInput: document.getElementById("accountLoginInput"),
    passwordInput: document.getElementById("accountPasswordInput"),
    logout: document.getElementById("logoutButton"),
    adminLink: document.getElementById("accountAdminLink"),
};

const formatDate = (value) => {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
};

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
}

async function login(username, password) {
    const user = await fetchJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    state.user = user;
    localStorage.setItem("theaterUser", JSON.stringify(user));
    await render();
}

function logout() {
    state.user = null;
    localStorage.removeItem("theaterUser");
    render();
}

async function render() {
    if (!state.user) {
        els.status.textContent = "Войдите, чтобы увидеть свои бронирования";
        els.login.hidden = false;
        els.content.hidden = true;
        els.logout.hidden = true;
        els.adminLink.hidden = true;
        return;
    }

    els.login.hidden = true;
    els.content.hidden = false;
    els.logout.hidden = false;
    els.adminLink.hidden = state.user.role !== "admin";
    els.status.textContent = state.user.role === "admin"
        ? "Вы вошли как администратор"
        : "Вы вошли как пользователь";

    const bookings = await fetchJson(`/api/users/${state.user.username}/bookings`);
    els.summary.innerHTML = `
        <div>
            <strong>${state.user.name}</strong>
            <span>${state.user.username} · ${state.user.role === "admin" ? "администратор" : "пользователь"}</span>
        </div>
        <div>
            <strong>${bookings.length}</strong>
            <span>бронирований</span>
        </div>
    `;

    if (!bookings.length) {
        els.bookings.innerHTML = `<div class="result-empty">Бронирований пока нет. Вернитесь в афишу и выберите места.</div>`;
        return;
    }

    els.bookings.innerHTML = bookings.map((booking) => `
        <article class="booking-card">
            <h3>${booking.performance_title}</h3>
            <p>${booking.theater} · ${formatDate(booking.date)} · ${booking.time}</p>
            <p>Места: <strong>${booking.seats.join(", ")}</strong></p>
            <p>Итого: <strong>${Number(booking.total).toLocaleString("ru-RU")} ₽</strong></p>
            <p>${booking.status}</p>
        </article>
    `).join("");
}

els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        await login(els.loginInput.value.trim(), els.passwordInput.value);
    } catch (error) {
        console.error(error);
        alert("Неверный логин или пароль");
    }
});

document.querySelectorAll("[data-login]").forEach((button) => {
    button.addEventListener("click", () => {
        els.loginInput.value = button.dataset.login;
        els.passwordInput.value = button.dataset.password;
    });
});

els.logout.addEventListener("click", logout);

render().catch((error) => {
    console.error(error);
    els.status.textContent = "Не удалось загрузить кабинет";
});
