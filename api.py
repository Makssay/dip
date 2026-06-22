import json
import html
from datetime import date, timedelta
from pathlib import Path
from typing import Literal
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


BASE_DIR = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "performances.json"
BOOKINGS_FILE = DATA_DIR / "bookings.json"

DEMO_USERS = {
    "user": {"password": "user123", "role": "user", "name": "Демо пользователь"},
    "admin": {"password": "admin123", "role": "admin", "name": "Администратор"},
}


class Performance(BaseModel):
    id: int
    title: str
    theater: str
    genre: str
    date: str
    time: str
    price: int
    image: str
    address: str
    duration: str
    age: str
    description: str
    featured: bool = False


class PerformanceList(BaseModel):
    total: int
    performances: list[Performance]


class PerformancePayload(BaseModel):
    title: str
    theater: str
    genre: str
    date: str
    time: str
    price: int
    image: str
    address: str
    duration: str
    age: str
    description: str
    featured: bool = False


class LoginPayload(BaseModel):
    username: str
    password: str


class UserSession(BaseModel):
    username: str
    role: Literal["user", "admin"]
    name: str


class BookingPayload(BaseModel):
    username: str
    performance_id: int
    seats: list[str]


class Booking(BaseModel):
    id: int
    username: str
    performance_id: int
    performance_title: str
    theater: str
    date: str
    time: str
    seats: list[str]
    total: int
    status: str = "Забронировано"


def build_performances() -> list[Performance]:
    today = date.today()
    rows = [
        ("Чайка", "МХТ им. Чехова", "Драма", 0, "19:00", 1800, "Камергерский пер., 3", "2 ч 45 мин", "16+", True),
        ("Лебединое озеро", "Большой театр", "Балет", 1, "19:30", 3200, "Театральная пл., 1", "2 ч 30 мин", "6+", False),
        ("Евгений Онегин", "Театр им. Вахтангова", "Драма", 2, "18:30", 1400, "ул. Арбат, 26", "3 ч", "12+", False),
        ("Вишневый сад", "МХТ им. Чехова", "Драма", 3, "19:00", 2100, "Камергерский пер., 3", "2 ч 50 мин", "16+", False),
        ("Мастер и Маргарита", "Театр на Таганке", "Мистика", 4, "20:00", 1700, "ул. Земляной Вал, 76/21", "3 ч 10 мин", "18+", False),
        ("Щелкунчик", "Большой театр", "Балет", 5, "18:00", 2900, "Театральная пл., 1", "2 ч 15 мин", "6+", False),
        ("Три сестры", "Современник", "Драма", 6, "19:00", 1500, "Чистопрудный б-р, 19", "2 ч 40 мин", "16+", False),
        ("Гамлет", "Театр им. Вахтангова", "Трагедия", 7, "19:30", 2300, "ул. Арбат, 26", "3 ч 20 мин", "16+", False),
        ("Ревизор", "Театр Олега Табакова", "Комедия", 8, "19:00", 1200, "ул. Чаплыгина, 1А", "2 ч 20 мин", "12+", False),
        ("Кармен", "Новая Опера", "Опера", 9, "19:00", 2600, "ул. Каретный Ряд, 3", "2 ч 55 мин", "16+", False),
        ("Дядя Ваня", "МХТ им. Чехова", "Драма", 10, "18:30", 1600, "Камергерский пер., 3", "2 ч 35 мин", "12+", False),
        ("Пиковая дама", "Большой театр", "Опера", 12, "19:00", 3500, "Театральная пл., 1", "3 ч", "16+", False),
    ]

    images = [
        "https://images.unsplash.com/photo-1507924538820-ede94a04019d?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1562329265-95a6d7a83440?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1504680177321-2e6a879aac86?auto=format&fit=crop&w=900&q=85",
        "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=85",
    ]

    performances: list[Performance] = []
    for index, item in enumerate(rows, start=1):
        title, theater, genre, day_offset, time, price, address, duration, age, featured = item
        performances.append(
            Performance(
                id=index,
                title=title,
                theater=theater,
                genre=genre,
                date=(today + timedelta(days=day_offset)).isoformat(),
                time=time,
                price=price,
                image=images[index - 1],
                address=address,
                duration=duration,
                age=age,
                featured=featured,
                description=(
                    f"{title} в постановке {theater}. Камерная атмосфера, сильный актерский ансамбль "
                    "и понятный путь к покупке билета без лишних шагов."
                ),
            )
        )
    return performances


def ensure_data_file() -> None:
    if DATA_FILE.exists():
        return
    DATA_DIR.mkdir(exist_ok=True)
    write_performances(build_performances())


def read_performances() -> list[Performance]:
    ensure_data_file()
    with DATA_FILE.open("r", encoding="utf-8") as file:
        raw_items = json.load(file)
    return [Performance(**item) for item in raw_items]


def write_performances(items: list[Performance]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump([item.model_dump() for item in items], file, ensure_ascii=False, indent=2)


def read_bookings() -> list[Booking]:
    DATA_DIR.mkdir(exist_ok=True)
    if not BOOKINGS_FILE.exists():
        write_bookings([])
    with BOOKINGS_FILE.open("r", encoding="utf-8") as file:
        raw_items = json.load(file)
    return [Booking(**item) for item in raw_items]


def write_bookings(items: list[Booking]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with BOOKINGS_FILE.open("w", encoding="utf-8") as file:
        json.dump([item.model_dump() for item in items], file, ensure_ascii=False, indent=2)


def excel_cell(value: object, cell_ref: str) -> str:
    safe_value = html.escape(str(value), quote=False)
    return f'<c r="{cell_ref}" t="inlineStr"><is><t>{safe_value}</t></is></c>'


def build_bookings_xlsx(bookings: list[Booking]) -> bytes:
    headers = ["ID", "Пользователь", "Спектакль", "Театр", "Дата", "Время", "Места", "Сумма", "Статус"]
    rows: list[list[object]] = [headers]
    rows.extend(
        [
            booking.id,
            booking.username,
            booking.performance_title,
            booking.theater,
            booking.date,
            booking.time,
            ", ".join(booking.seats),
            booking.total,
            booking.status,
        ]
        for booking in bookings
    )

    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for col_index, value in enumerate(row):
            col_name = chr(ord("A") + col_index)
            cells.append(excel_cell(value, f"{col_name}{row_index}"))
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    worksheet = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )
    workbook = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Bookings" sheetId="1" r:id="rId1"/></sheets></workbook>'
    )
    workbook_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
        'Target="worksheets/sheet1.xml"/></Relationships>'
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="xl/workbook.xml"/></Relationships>'
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )

    from io import BytesIO

    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook)
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)
    return output.getvalue()


def next_id(items: list[Performance]) -> int:
    return max((item.id for item in items), default=0) + 1


def next_booking_id(items: list[Booking]) -> int:
    return max((item.id for item in items), default=0) + 1


def find_performance(performance_id: int) -> Performance:
    for item in read_performances():
        if item.id == performance_id:
            return item
    raise HTTPException(status_code=404, detail="Performance not found")


def occupied_seats(performance_id: int) -> set[str]:
    seats: set[str] = set()
    for booking in read_bookings():
        if booking.performance_id == performance_id:
            seats.update(booking.seats)
    return seats


def apply_featured_rule(items: list[Performance], featured_id: int | None = None) -> list[Performance]:
    if featured_id is not None:
        for item in items:
            item.featured = item.id == featured_id
    elif items and not any(item.featured for item in items):
        items[0].featured = True
    return items

app = FastAPI(title="Theater Playbill API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def root() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/admin")
def admin() -> FileResponse:
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/account")
def account() -> FileResponse:
    return FileResponse(STATIC_DIR / "account.html")


@app.post("/api/auth/login", response_model=UserSession)
def login(payload: LoginPayload) -> UserSession:
    user = DEMO_USERS.get(payload.username)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid login or password")
    return UserSession(username=payload.username, role=user["role"], name=user["name"])


@app.get("/api/auth/demo-users")
def demo_users() -> dict[str, list[dict[str, str]]]:
    return {
        "users": [
            {"username": username, "password": data["password"], "role": data["role"], "name": data["name"]}
            for username, data in DEMO_USERS.items()
        ]
    }


@app.get("/api/performances", response_model=PerformanceList)
def list_performances(
    q: str = "",
    theater: str = "",
    genre: str = "",
    date_from: str = "",
    date_to: str = "",
    sort: Literal["date", "price_asc", "price_desc", "title"] = "date",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> PerformanceList:
    results = read_performances()

    if q:
        needle = q.lower()
        results = [
            item
            for item in results
            if needle in item.title.lower()
            or needle in item.theater.lower()
            or needle in item.genre.lower()
        ]
    if theater:
        results = [item for item in results if item.theater == theater]
    if genre:
        results = [item for item in results if item.genre == genre]
    if date_from:
        results = [item for item in results if item.date >= date_from]
    if date_to:
        results = [item for item in results if item.date <= date_to]

    if sort == "price_asc":
        results = sorted(results, key=lambda item: item.price)
    elif sort == "price_desc":
        results = sorted(results, key=lambda item: item.price, reverse=True)
    elif sort == "title":
        results = sorted(results, key=lambda item: item.title)
    else:
        results = sorted(results, key=lambda item: (item.date, item.time))

    total = len(results)
    return PerformanceList(total=total, performances=results[offset : offset + limit])


@app.get("/api/performances/{performance_id}", response_model=Performance)
def get_performance(performance_id: int) -> Performance:
    return find_performance(performance_id)


@app.get("/api/performances/{performance_id}/seats")
def get_seats(performance_id: int) -> dict[str, object]:
    performance = find_performance(performance_id)
    occupied = occupied_seats(performance_id)
    rows = []
    for row_index, row_name in enumerate(["A", "B", "C", "D", "E", "F"], start=1):
        seats = []
        for seat_number in range(1, 11):
            seat_id = f"{row_name}{seat_number}"
            multiplier = 1.45 if row_index <= 2 else 1.15 if row_index <= 4 else 1
            seats.append(
                {
                    "id": seat_id,
                    "row": row_name,
                    "number": seat_number,
                    "price": int(performance.price * multiplier),
                    "occupied": seat_id in occupied,
                }
            )
        rows.append({"row": row_name, "seats": seats})
    return {"performance": performance, "rows": rows}


@app.post("/api/bookings", response_model=Booking)
def create_booking(payload: BookingPayload) -> Booking:
    if payload.username not in DEMO_USERS:
        raise HTTPException(status_code=401, detail="Unknown user")
    if not payload.seats:
        raise HTTPException(status_code=400, detail="Choose at least one seat")

    performance = find_performance(payload.performance_id)
    busy = occupied_seats(payload.performance_id)
    if any(seat in busy for seat in payload.seats):
        raise HTTPException(status_code=409, detail="Some seats are already booked")

    seat_prices = {
        seat["id"]: seat["price"]
        for row in get_seats(payload.performance_id)["rows"]
        for seat in row["seats"]
    }
    total = sum(seat_prices.get(seat, performance.price) for seat in payload.seats)
    bookings = read_bookings()
    booking = Booking(
        id=next_booking_id(bookings),
        username=payload.username,
        performance_id=performance.id,
        performance_title=performance.title,
        theater=performance.theater,
        date=performance.date,
        time=performance.time,
        seats=payload.seats,
        total=total,
    )
    bookings.append(booking)
    write_bookings(bookings)
    return booking


@app.get("/api/users/{username}/bookings", response_model=list[Booking])
def user_bookings(username: str) -> list[Booking]:
    return [booking for booking in read_bookings() if booking.username == username]


@app.get("/api/theaters")
def list_theaters() -> dict[str, list[str]]:
    return {"theaters": sorted({item.theater for item in read_performances()})}


@app.get("/api/genres")
def list_genres() -> dict[str, list[str]]:
    return {"genres": sorted({item.genre for item in read_performances()})}


@app.get("/api/stats")
def stats() -> dict[str, int]:
    performances = read_performances()
    bookings = read_bookings()
    return {
        "performances": len(performances),
        "theaters": len({item.theater for item in performances}),
        "genres": len({item.genre for item in performances}),
        "bookings": len(bookings),
    }


@app.get("/api/admin/performances", response_model=list[Performance])
def admin_list_performances() -> list[Performance]:
    return sorted(read_performances(), key=lambda item: (item.date, item.time, item.title))


@app.post("/api/admin/performances", response_model=Performance)
def admin_create_performance(payload: PerformancePayload) -> Performance:
    items = read_performances()
    item = Performance(id=next_id(items), **payload.model_dump())
    items.append(item)
    apply_featured_rule(items, item.id if item.featured else None)
    write_performances(items)
    return item


@app.put("/api/admin/performances/{performance_id}", response_model=Performance)
def admin_update_performance(performance_id: int, payload: PerformancePayload) -> Performance:
    items = read_performances()
    for index, item in enumerate(items):
        if item.id == performance_id:
            updated = Performance(id=performance_id, **payload.model_dump())
            items[index] = updated
            apply_featured_rule(items, updated.id if updated.featured else None)
            write_performances(items)
            return updated
    raise HTTPException(status_code=404, detail="Performance not found")


@app.delete("/api/admin/performances/{performance_id}")
def admin_delete_performance(performance_id: int) -> dict[str, bool]:
    items = read_performances()
    next_items = [item for item in items if item.id != performance_id]
    if len(next_items) == len(items):
        raise HTTPException(status_code=404, detail="Performance not found")
    apply_featured_rule(next_items)
    write_performances(next_items)
    return {"ok": True}


@app.get("/api/admin/bookings", response_model=list[Booking])
def admin_list_bookings() -> list[Booking]:
    return sorted(read_bookings(), key=lambda item: item.id, reverse=True)


@app.get("/api/admin/bookings/export.xlsx")
def admin_export_bookings() -> Response:
    content = build_bookings_xlsx(admin_list_bookings())
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="bookings.xlsx"'},
    )


@app.get("/api/admin/bookings.xlsx")
def admin_export_bookings_short() -> Response:
    return admin_export_bookings()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
