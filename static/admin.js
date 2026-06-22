const API = "/api/admin/performances";

const form = document.getElementById("performanceForm");
const list = document.getElementById("adminList");
const itemsCount = document.getElementById("itemsCount");
const formMode = document.getElementById("formMode");
const formTitle = document.getElementById("formTitle");
const newButton = document.getElementById("newButton");
const cancelButton = document.getElementById("cancelButton");
const deleteButton = document.getElementById("deleteButton");
const toast = document.getElementById("toast");
const bookingsList = document.getElementById("bookingsList");
const bookingsCount = document.getElementById("bookingsCount");
const posterPreset = document.getElementById("posterPreset");
const bookingSearch = document.getElementById("bookingSearch");
const bookingStatusFilter = document.getElementById("bookingStatusFilter");
const bookingPrev = document.getElementById("bookingPrev");
const bookingNext = document.getElementById("bookingNext");
const bookingPageInfo = document.getElementById("bookingPageInfo");

const fields = [
    "performanceId",
    "title",
    "theater",
    "genre",
    "date",
    "time",
    "price",
    "age",
    "address",
    "duration",
    "image",
    "description",
    "featured",
];

let performances = [];
let bookings = [];
let bookingPage = 1;
const bookingsPerPage = 20;

function field(id) {
    return document.getElementById(id);
}

function formatDate(value) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("active");
    window.setTimeout(() => toast.classList.remove("active"), 2200);
}

async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

async function loadItems() {
    performances = await request(API);
    itemsCount.textContent = `${performances.length} шт.`;
    renderList();
    if (!field("performanceId").value && performances[0]) {
        fillForm(performances[0]);
    }
}

async function loadBookings() {
    bookings = await request("/api/admin/bookings");
    bookingsCount.textContent = `${bookings.length} шт.`;
    renderBookings();
}

function renderBookings() {
    const search = bookingSearch.value.trim().toLowerCase();
    const status = bookingStatusFilter.value;
    const filtered = bookings.filter((booking) => {
        const haystack = [
            booking.id,
            booking.username,
            booking.performance_title,
            booking.theater,
            booking.date,
            booking.time,
            booking.seats.join(" "),
            booking.status,
        ].join(" ").toLowerCase();
        return (!search || haystack.includes(search)) && (!status || booking.status === status);
    });

    const pages = Math.max(1, Math.ceil(filtered.length / bookingsPerPage));
    bookingPage = Math.min(bookingPage, pages);
    const start = (bookingPage - 1) * bookingsPerPage;
    const pageItems = filtered.slice(start, start + bookingsPerPage);

    bookingPageInfo.textContent = `Страница ${bookingPage} из ${pages}`;
    bookingPrev.disabled = bookingPage <= 1;
    bookingNext.disabled = bookingPage >= pages;

    if (!pageItems.length) {
        bookingsList.innerHTML = `
            <tr>
                <td class="empty-row" colspan="7">Заказы не найдены</td>
            </tr>
        `;
        return;
    }

    bookingsList.innerHTML = pageItems.map((booking) => `
        <tr>
            <td>${booking.id}</td>
            <td>${booking.username}</td>
            <td><strong>${booking.performance_title}</strong><br><small>${booking.theater}</small></td>
            <td>${formatDate(booking.date)}<br><small>${booking.time}</small></td>
            <td>${booking.seats.join(", ")}</td>
            <td>${Number(booking.total).toLocaleString("ru-RU")} ₽</td>
            <td><span class="status-pill">${booking.status}</span></td>
        </tr>
    `).join("");
}

function renderList() {
    list.innerHTML = performances.map((item) => `
        <button class="admin-item" type="button" data-id="${item.id}">
            <strong>${item.title}</strong>
            <p>${item.theater} · ${item.genre} · ${formatDate(item.date)} · ${item.time}</p>
            <p>${item.featured ? "Главный спектакль · " : ""}от ${Number(item.price).toLocaleString("ru-RU")} ₽</p>
        </button>
    `).join("");

    list.querySelectorAll(".admin-item").forEach((button) => {
        button.addEventListener("click", () => {
            const item = performances.find((entry) => entry.id === Number(button.dataset.id));
            if (item) fillForm(item);
        });
    });

    markActive();
}

function markActive() {
    const activeId = field("performanceId").value;
    list.querySelectorAll(".admin-item").forEach((button) => {
        button.classList.toggle("active", button.dataset.id === activeId);
    });
}

function fillForm(item) {
    field("performanceId").value = item.id;
    field("title").value = item.title;
    field("theater").value = item.theater;
    field("genre").value = item.genre;
    field("date").value = item.date;
    field("time").value = item.time;
    field("price").value = item.price;
    field("age").value = item.age;
    field("address").value = item.address;
    field("duration").value = item.duration;
    field("image").value = item.image;
    field("description").value = item.description;
    field("featured").checked = item.featured;
    formMode.textContent = "Редактирование";
    formTitle.textContent = item.title;
    deleteButton.hidden = false;
    markActive();
}

function clearForm() {
    form.reset();
    field("performanceId").value = "";
    field("image").value = "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=85";
    field("genre").value = "Драма";
    field("age").value = "16+";
    field("duration").value = "2 ч";
    posterPreset.value = "";
    field("date").value = new Date().toISOString().slice(0, 10);
    field("time").value = "19:00";
    formMode.textContent = "Создание";
    formTitle.textContent = "Новый спектакль";
    deleteButton.hidden = true;
    markActive();
}

function payloadFromForm() {
    return {
        title: field("title").value.trim(),
        theater: field("theater").value.trim(),
        genre: field("genre").value.trim(),
        date: field("date").value,
        time: field("time").value,
        price: Number(field("price").value),
        age: field("age").value.trim(),
        address: field("address").value.trim(),
        duration: field("duration").value.trim(),
        image: field("image").value.trim(),
        description: field("description").value.trim(),
        featured: field("featured").checked,
    };
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = field("performanceId").value;
    const payload = payloadFromForm();

    try {
        const saved = id
            ? await request(`${API}/${id}`, { method: "PUT", body: JSON.stringify(payload) })
            : await request(API, { method: "POST", body: JSON.stringify(payload) });
        showToast("Спектакль сохранен");
        await loadItems();
        await loadBookings();
        fillForm(saved);
    } catch (error) {
        console.error(error);
        showToast("Не удалось сохранить");
    }
});

deleteButton.addEventListener("click", async () => {
    const id = field("performanceId").value;
    if (!id) return;
    if (!window.confirm("Удалить спектакль из афиши?")) return;

    try {
        await request(`${API}/${id}`, { method: "DELETE" });
        showToast("Спектакль удален");
        clearForm();
        await loadItems();
        await loadBookings();
    } catch (error) {
        console.error(error);
        showToast("Не удалось удалить");
    }
});

newButton.addEventListener("click", clearForm);
cancelButton.addEventListener("click", clearForm);
posterPreset.addEventListener("change", () => {
    if (posterPreset.value) {
        field("image").value = posterPreset.value;
    }
});
bookingSearch.addEventListener("input", () => {
    bookingPage = 1;
    renderBookings();
});
bookingStatusFilter.addEventListener("change", () => {
    bookingPage = 1;
    renderBookings();
});
bookingPrev.addEventListener("click", () => {
    bookingPage = Math.max(1, bookingPage - 1);
    renderBookings();
});
bookingNext.addEventListener("click", () => {
    bookingPage += 1;
    renderBookings();
});

deleteButton.hidden = true;
Promise.all([loadItems(), loadBookings()]).catch((error) => {
    console.error(error);
    showToast("Не удалось загрузить админку");
});
