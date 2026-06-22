const API = "/api";

const state = {
    q: "",
    theater: "",
    genre: "",
    date_from: "",
    date_to: "",
    sort: "date",
    user: JSON.parse(localStorage.getItem("theaterUser") || "null"),
    selectedSeats: [],
    activeSeatPrices: {},
    activePerformanceId: null,
};

const els = {
    featured: document.getElementById("featuredCard"),
    grid: document.getElementById("eventsGrid"),
    premieresGrid: document.getElementById("premieresGrid"),
    resultCount: document.getElementById("resultCount"),
    searchForm: document.getElementById("headerSearch"),
    searchInput: document.getElementById("searchInput"),
    theaterFilter: document.getElementById("theaterFilter"),
    genreFilter: document.getElementById("genreFilter"),
    dateFrom: document.getElementById("dateFrom"),
    dateTo: document.getElementById("dateTo"),
    sortFilter: document.getElementById("sortFilter"),
    resetFilters: document.getElementById("resetFilters"),
    theaterList: document.getElementById("theaterList"),
    dialog: document.getElementById("eventDialog"),
    dialogBody: document.getElementById("dialogBody"),
    closeDialog: document.getElementById("closeDialog"),
    todayButton: document.getElementById("todayButton"),
    loginButton: document.getElementById("loginButton"),
    authDialog: document.getElementById("authDialog"),
    authForm: document.getElementById("authForm"),
    authLogin: document.getElementById("authLogin"),
    authPassword: document.getElementById("authPassword"),
    closeAuth: document.getElementById("closeAuth"),
    seatsDialog: document.getElementById("seatsDialog"),
    seatsBody: document.getElementById("seatsBody"),
    closeSeats: document.getElementById("closeSeats"),
    adminNavLink: document.getElementById("adminNavLink"),
};

const formatDate = (value) => {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        weekday: "short",
    }).format(new Date(`${value}T12:00:00`));
};

const formatPrice = (value) => `от ${Number(value).toLocaleString("ru-RU")} ₽`;

const toIso = (date) => date.toISOString().slice(0, 10);

const addDays = (days) => {
    const next = new Date();
    next.setDate(next.getDate() + days);
    return toIso(next);
};

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json();
}

async function sendJson(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
}

function paramsFromState() {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    return params;
}

async function loadInitialData() {
    const [theaters, genres] = await Promise.all([
        fetchJson(`${API}/theaters`),
        fetchJson(`${API}/genres`),
    ]);

    fillSelect(els.theaterFilter, theaters.theaters);
    fillSelect(els.genreFilter, genres.genres);
    renderTheaters(theaters.theaters);
    await loadPremieres();
    await loadPerformances();
    updateAuthUi();
}

function fillSelect(select, values) {
    values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function renderTheaters(theaters) {
    els.theaterList.innerHTML = theaters
        .map((theater) => `<button class="theater-pill" type="button" data-theater="${theater}">${theater}</button>`)
        .join("");

    els.theaterList.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            state.theater = button.dataset.theater;
            els.theaterFilter.value = state.theater;
            loadPerformances();
            document.getElementById("events").scrollIntoView({ behavior: "smooth" });
        });
    });
}

async function loadPerformances() {
    els.grid.innerHTML = `<div class="result-empty">Загружаем афишу...</div>`;
    try {
        const data = await fetchJson(`${API}/performances?${paramsFromState()}`);
        renderFeatured(data.performances);
        renderCards(data.performances);
        els.resultCount.textContent = `${data.total} ${plural(data.total, ["спектакль", "спектакля", "спектаклей"])}`;
    } catch (error) {
        els.grid.innerHTML = `<div class="result-empty">Не удалось загрузить афишу. Проверьте, запущен ли сервер.</div>`;
        els.resultCount.textContent = "Ошибка загрузки";
        console.error(error);
    }
}

async function loadPremieres() {
    if (!els.premieresGrid) return;
    els.premieresGrid.innerHTML = `<div class="result-empty">Загружаем премьеры...</div>`;

    try {
        const data = await fetchJson(`${API}/performances?limit=4&sort=date`);
        els.premieresGrid.innerHTML = data.performances.slice(0, 4).map((item) => `
            <button class="premiere-card" type="button" data-id="${item.id}">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <div>
                    <p>${item.genre} · ${formatDate(item.date)}</p>
                    <h3>${item.title}</h3>
                    <p>${item.theater} · ${formatPrice(item.price)}</p>
                </div>
            </button>
        `).join("");

        els.premieresGrid.querySelectorAll(".premiere-card").forEach((card) => {
            card.addEventListener("click", async () => {
                const item = await fetchJson(`${API}/performances/${card.dataset.id}`);
                openDialog(item);
            });
        });
    } catch (error) {
        els.premieresGrid.innerHTML = `<div class="result-empty">Не удалось загрузить премьеры.</div>`;
        console.error(error);
    }
}

function plural(count, forms) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
}

function renderFeatured(performances) {
    const featured = performances.find((item) => item.featured) || performances[0];
    if (!featured) {
        els.featured.innerHTML = "";
        return;
    }

    els.featured.innerHTML = `
        <div class="featured-media">
            <img src="${featured.image}" alt="${featured.title}">
            <span class="featured-badge">Главный спектакль</span>
        </div>
        <div class="featured-info">
            <h2 class="featured-title">${featured.title}</h2>
            <div class="featured-row">
                <div class="event-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${formatDate(featured.date)}</span>
                    <span><i class="fa-regular fa-clock"></i> ${featured.time}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${featured.theater}</span>
                </div>
                <span class="price">${formatPrice(featured.price)}</span>
            </div>
        </div>
    `;
    els.featured.onclick = () => openDialog(featured);
}

function renderCards(performances) {
    if (!performances.length) {
        els.grid.innerHTML = `<div class="result-empty">Ничего не найдено. Попробуйте изменить фильтры.</div>`;
        return;
    }

    els.grid.innerHTML = performances.map((item) => `
        <button class="event-card" type="button" data-id="${item.id}">
            <div class="poster">
                <img src="${item.image}" alt="${item.title}" loading="lazy">
                <span class="card-badge">${item.genre}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-theater"><i class="fa-solid fa-landmark"></i> ${item.theater}</p>
                <p class="card-date"><i class="fa-regular fa-calendar"></i> ${formatDate(item.date)} · ${item.time}</p>
                <div class="card-footer">
                    <span class="price">${formatPrice(item.price)}</span>
                    <span class="ticket-link">Подробнее</span>
                </div>
            </div>
        </button>
    `).join("");

    els.grid.querySelectorAll(".event-card").forEach((card) => {
        card.addEventListener("click", async () => {
            const item = await fetchJson(`${API}/performances/${card.dataset.id}`);
            openDialog(item);
        });
    });
}

function openDialog(item) {
    els.dialogBody.innerHTML = `
        <div class="dialog-poster">
            <img src="${item.image}" alt="${item.title}">
        </div>
        <div class="dialog-copy">
            <p class="eyebrow">${item.genre} · ${item.age}</p>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="dialog-facts">
                <div class="fact"><small>Дата</small><strong>${formatDate(item.date)}</strong></div>
                <div class="fact"><small>Время</small><strong>${item.time}</strong></div>
                <div class="fact"><small>Длительность</small><strong>${item.duration}</strong></div>
                <div class="fact"><small>Цена</small><strong>${formatPrice(item.price)}</strong></div>
            </div>
            <p><i class="fa-solid fa-location-dot"></i> ${item.theater}, ${item.address}</p>
            <button class="primary-action" type="button" data-book="${item.id}">
                Выбрать билеты
                <i class="fa-solid fa-ticket"></i>
            </button>
        </div>
    `;
    els.dialog.showModal();
    els.dialogBody.querySelector("[data-book]").addEventListener("click", () => {
        els.dialog.close();
        openSeats(item.id);
    });
}

async function openSeats(performanceId) {
    if (!state.user) {
        els.authDialog.showModal();
        return;
    }

    state.selectedSeats = [];
    state.activeSeatPrices = {};
    state.activePerformanceId = performanceId;

    const data = await fetchJson(`${API}/performances/${performanceId}/seats`);
    els.seatsBody.innerHTML = `
        <p class="eyebrow">Выбор мест</p>
        <h3>${data.performance.title}</h3>
        <p>${data.performance.theater} · ${formatDate(data.performance.date)} · ${data.performance.time}</p>
        <div class="stage">Сцена</div>
        <div class="seat-map">
            ${data.rows.map((row) => `
                <div class="seat-row">
                    <span class="row-label">${row.row}</span>
                    ${row.seats.map((seat) => {
                        state.activeSeatPrices[seat.id] = seat.price;
                        return `<button class="seat ${seat.occupied ? "occupied" : ""}" type="button" data-seat="${seat.id}" ${seat.occupied ? "disabled" : ""}>${seat.number}</button>`;
                    }).join("")}
                </div>
            `).join("")}
        </div>
        <div class="seat-summary">
            <div>
                <strong id="seatTotal">0 ₽</strong>
                <p id="seatPicked">Места не выбраны</p>
            </div>
            <button class="primary-action" id="confirmBooking" type="button">Забронировать</button>
        </div>
    `;

    els.seatsBody.querySelectorAll(".seat:not(.occupied)").forEach((button) => {
        button.addEventListener("click", () => toggleSeat(button));
    });
    els.seatsBody.querySelector("#confirmBooking").addEventListener("click", confirmBooking);
    els.seatsDialog.showModal();
}

function toggleSeat(button) {
    const seat = button.dataset.seat;
    if (state.selectedSeats.includes(seat)) {
        state.selectedSeats = state.selectedSeats.filter((item) => item !== seat);
        button.classList.remove("selected");
    } else {
        state.selectedSeats.push(seat);
        button.classList.add("selected");
    }
    renderSeatSummary();
}

function renderSeatSummary() {
    const total = state.selectedSeats.reduce((sum, seat) => sum + (state.activeSeatPrices[seat] || 0), 0);
    els.seatsBody.querySelector("#seatTotal").textContent = `${total.toLocaleString("ru-RU")} ₽`;
    els.seatsBody.querySelector("#seatPicked").textContent = state.selectedSeats.length
        ? `Выбрано: ${state.selectedSeats.join(", ")}`
        : "Места не выбраны";
}

async function confirmBooking() {
    if (!state.selectedSeats.length) {
        alert("Выберите хотя бы одно место");
        return;
    }
    await sendJson(`${API}/bookings`, {
        username: state.user.username,
        performance_id: state.activePerformanceId,
        seats: state.selectedSeats,
    });
    els.seatsDialog.close();
    await loadPerformances();
    alert("Бронирование создано");
    window.location.href = "/account";
}

async function login(username, password) {
    const user = await sendJson(`${API}/auth/login`, { username, password });
    state.user = user;
    localStorage.setItem("theaterUser", JSON.stringify(user));
    els.authDialog.close();
    updateAuthUi();
}

function updateAuthUi() {
    if (!state.user) {
        els.loginButton.classList.remove("admin");
        els.loginButton.innerHTML = `<i class="fa-solid fa-user"></i><span>Войти</span>`;
        if (els.adminNavLink) els.adminNavLink.hidden = true;
        return;
    }

    els.loginButton.classList.toggle("admin", state.user.role === "admin");
    els.loginButton.innerHTML = `<i class="fa-solid fa-user-check"></i><span>Личный кабинет</span>`;
    if (els.adminNavLink) els.adminNavLink.hidden = state.user.role !== "admin";
}

function applyRange(range) {
    document.querySelectorAll(".date-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.range === range);
    });

    if (range === "today") {
        state.date_from = addDays(0);
        state.date_to = addDays(0);
    } else if (range === "tomorrow") {
        state.date_from = addDays(1);
        state.date_to = addDays(1);
    } else if (range === "week") {
        state.date_from = addDays(0);
        state.date_to = addDays(7);
    } else if (range === "weekend") {
        const now = new Date();
        const day = now.getDay();
        const saturdayOffset = (6 - day + 7) % 7 || 7;
        state.date_from = addDays(saturdayOffset);
        state.date_to = addDays(saturdayOffset + 1);
    } else {
        state.date_from = "";
        state.date_to = "";
    }

    els.dateFrom.value = state.date_from;
    els.dateTo.value = state.date_to;
    loadPerformances();
}

function bindEvents() {
    els.loginButton.addEventListener("click", () => {
        if (state.user) {
            window.location.href = "/account";
            return;
        }
        els.authDialog.showModal();
    });

    els.authForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            await login(els.authLogin.value.trim(), els.authPassword.value);
        } catch (error) {
            console.error(error);
            alert("Неверный логин или пароль");
        }
    });

    document.querySelectorAll("[data-login]").forEach((button) => {
        button.addEventListener("click", () => {
            els.authLogin.value = button.dataset.login;
            els.authPassword.value = button.dataset.password;
        });
    });

    els.searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        state.q = els.searchInput.value.trim();
        loadPerformances();
    });

    els.searchInput.addEventListener("input", () => {
        state.q = els.searchInput.value.trim();
        window.clearTimeout(els.searchInput.searchTimer);
        els.searchInput.searchTimer = window.setTimeout(loadPerformances, 240);
    });

    [
        [els.theaterFilter, "theater"],
        [els.genreFilter, "genre"],
        [els.dateFrom, "date_from"],
        [els.dateTo, "date_to"],
        [els.sortFilter, "sort"],
    ].forEach(([element, key]) => {
        element.addEventListener("change", () => {
            state[key] = element.value;
            document.querySelectorAll(".date-chip").forEach((chip) => chip.classList.remove("active"));
            loadPerformances();
        });
    });

    document.querySelectorAll(".date-chip").forEach((button) => {
        button.addEventListener("click", () => applyRange(button.dataset.range));
    });

    els.todayButton.addEventListener("click", () => {
        applyRange("today");
        document.getElementById("events").scrollIntoView({ behavior: "smooth" });
    });

    els.resetFilters.addEventListener("click", () => {
        Object.assign(state, {
            q: "",
            theater: "",
            genre: "",
            date_from: "",
            date_to: "",
            sort: "date",
        });
        els.searchInput.value = "";
        els.theaterFilter.value = "";
        els.genreFilter.value = "";
        els.dateFrom.value = "";
        els.dateTo.value = "";
        els.sortFilter.value = "date";
        document.querySelectorAll(".date-chip").forEach((chip) => {
            chip.classList.toggle("active", chip.dataset.range === "all");
        });
        loadPerformances();
    });

    els.closeDialog.addEventListener("click", () => els.dialog.close());
    els.closeAuth.addEventListener("click", () => els.authDialog.close());
    els.closeSeats.addEventListener("click", () => els.seatsDialog.close());
    els.dialog.addEventListener("click", (event) => {
        if (event.target === els.dialog) els.dialog.close();
    });
    els.authDialog.addEventListener("click", (event) => {
        if (event.target === els.authDialog) els.authDialog.close();
    });
    els.seatsDialog.addEventListener("click", (event) => {
        if (event.target === els.seatsDialog) els.seatsDialog.close();
    });
}

bindEvents();
loadInitialData();
