#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DotaArena 2026 — Backend Server with SQLite Database
Полноценный локальный сервер с базой данных SQLite3 для аутентификации игроков и управления командами.
"""

import os
import sys
import json
import sqlite3
import hashlib
import secrets
import mimetypes
from datetime import datetime, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================
#  1. ИНИЦИАЛИЗАЦИЯ И РАБОТА С БАЗОЙ ДАННЫХ SQLITE3
# ============================================================
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return hashed, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    hashed, _ = hash_password(password, salt)
    return secrets.compare_digest(hashed, stored_hash)


def init_database():
    conn = get_db()
    cursor = conn.cursor()

    # Таблица пользователей
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            role TEXT DEFAULT 'player',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        );
    """)

    # Таблица сессий
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

    # Таблица команд
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT UNIQUE NOT NULL,
            captain TEXT NOT NULL,
            region TEXT,
            division TEXT,
            mmr INTEGER DEFAULT 0,
            payment INTEGER DEFAULT 1000,
            status TEXT DEFAULT 'registered',
            achievements TEXT,
            members_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
        );
    """)

    conn.commit()

    # Проверяем, есть ли тестовый пользователь, если база только создана
    cursor.execute("SELECT COUNT(*) as cnt FROM users")
    count = cursor.fetchone()["cnt"]
    if count == 0:
        # Создаем демо-пользователя Dendi
        h, s = hash_password("dota2026")
        cursor.execute(
            """INSERT INTO users (nickname, email, password_hash, salt, role)
               VALUES (?, ?, ?, ?, ?)""",
            ("Dendi", "dendi@dotaarena.ru", h, s, "pro_captain")
        )
        conn.commit()
        print("База данных SQLite создана. Добавлен демо-аккаунт: dendi@dotaarena.ru / dota2026")

    conn.close()


# ============================================================
#  2. HTTP ОБРАБОТЧИК ЗАПРОСОВ (REST API + СТАТИЧЕСКИЕ ФАЙЛЫ)
# ============================================================
class DotaArenaRequestHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        # Поддержка CORS для безопасной работы API
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status_code: int, data: dict):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def parse_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def get_auth_user(self):
        auth_header = self.headers.get("Authorization", "")
        token = None
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        if not token:
            return None

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id, u.nickname, u.email, u.role, u.created_at
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
        """, (token,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # --- API: Проверка статуса БД и сервера ---
        if path == "/api/status":
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) as total_users FROM users")
                u_cnt = cursor.fetchone()["total_users"]
                cursor.execute("SELECT sqlite_version() as v")
                ver = cursor.fetchone()["v"]
                conn.close()
                return self.send_json(200, {
                    "success": True,
                    "status": "online",
                    "database": "sqlite3",
                    "sqlite_version": ver,
                    "database_file": os.path.basename(DB_FILE),
                    "users_count": u_cnt,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                return self.send_json(500, {"success": False, "error": str(e)})

        # --- API: Информация о текущем пользователе ---
        if path == "/api/me":
            user = self.get_auth_user()
            if not user:
                return self.send_json(401, {"success": False, "error": "Не авторизован"})
            return self.send_json(200, {"success": True, "user": user})

        # --- API: Список пользователей (для инспекции базы данных) ---
        if path == "/api/users":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, nickname, email, role, created_at, last_login FROM users ORDER BY id DESC")
            users = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json(200, {"success": True, "users": users})

        # --- Раздача статических файлов сайта ---
        if path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()

        # ============================================================
        #  РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ (/api/register)
        # ============================================================
        if path == "/api/register":
            nickname = (body.get("nickname") or "").strip()
            email = (body.get("email") or "").strip().lower()
            password = (body.get("password") or "").strip()

            if not nickname or len(nickname) < 2:
                return self.send_json(400, {
                    "success": False,
                    "error": "Никнейм должен содержать минимум 2 символа"
                })

            if not email or "@" not in email or "." not in email:
                return self.send_json(400, {
                    "success": False,
                    "error": "Пожалуйста, введите корректный адрес электронной почты"
                })

            if not password or len(password) < 6:
                return self.send_json(400, {
                    "success": False,
                    "error": "Пароль должен содержать минимум 6 символов"
                })

            conn = get_db()
            cursor = conn.cursor()

            # Проверяем занятость email и никнейма
            cursor.execute("SELECT id, nickname, email FROM users WHERE lower(email) = ? OR lower(nickname) = ?", (email, nickname.lower()))
            existing = cursor.fetchone()
            if existing:
                conn.close()
                if existing["email"].lower() == email:
                    return self.send_json(409, {
                        "success": False,
                        "error": "Пользователь с таким email уже зарегистрирован. Пожалуйста, выполните вход."
                    })
                else:
                    return self.send_json(409, {
                        "success": False,
                        "error": f"Никнейм «{nickname}» уже занят другим игроком. Выберите другой никнейм."
                    })

            # Хэшируем пароль и сохраняем
            p_hash, salt = hash_password(password)
            now = datetime.now()
            cursor.execute("""
                INSERT INTO users (nickname, email, password_hash, salt, role, created_at, last_login)
                VALUES (?, ?, ?, ?, 'player', ?, ?)
            """, (nickname, email, p_hash, salt, now.isoformat(), now.isoformat()))
            user_id = cursor.lastrowid

            # Создаем токен сессии на 30 дней
            token = secrets.token_urlsafe(32)
            expires_at = (now + timedelta(days=30)).isoformat()
            cursor.execute("""
                INSERT INTO sessions (token, user_id, expires_at)
                VALUES (?, ?, ?)
            """, (token, user_id, expires_at))

            conn.commit()
            conn.close()

            user_data = {
                "id": user_id,
                "name": nickname,
                "nickname": nickname,
                "email": email,
                "role": "player",
                "createdAt": now.isoformat()
            }

            return self.send_json(201, {
                "success": True,
                "message": f"Добро пожаловать в личный кабинет, {nickname}!",
                "user": user_data,
                "token": token
            })

        # ============================================================
        #  ВХОД ПОЛЬЗОВАТЕЛЯ (/api/login)
        # ============================================================
        if path == "/api/login":
            login_str = (body.get("login") or body.get("email") or "").strip().lower()
            password = (body.get("password") or "").strip()

            if not login_str or not password:
                return self.send_json(400, {
                    "success": False,
                    "error": "Пожалуйста, введите логин/email и пароль"
                })

            conn = get_db()
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, nickname, email, password_hash, salt, role
                FROM users
                WHERE lower(email) = ? OR lower(nickname) = ?
            """, (login_str, login_str))
            user_row = cursor.fetchone()

            if not user_row:
                conn.close()
                return self.send_json(401, {
                    "success": False,
                    "error": "Пользователь с таким email или логином не найден. Зарегистрируйтесь во вкладке «Регистрация»."
                })

            if not verify_password(password, user_row["password_hash"], user_row["salt"]):
                conn.close()
                return self.send_json(401, {
                    "success": False,
                    "error": "Неверный пароль. Пожалуйста, проверьте введённые данные."
                })

            # Успешная авторизация: обновляем last_login и выдаем токен
            now = datetime.now()
            cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now.isoformat(), user_row["id"]))

            token = secrets.token_urlsafe(32)
            expires_at = (now + timedelta(days=30)).isoformat()
            cursor.execute("""
                INSERT INTO sessions (token, user_id, expires_at)
                VALUES (?, ?, ?)
            """, (token, user_row["id"], expires_at))

            conn.commit()
            conn.close()

            user_data = {
                "id": user_row["id"],
                "name": user_row["nickname"],
                "nickname": user_row["nickname"],
                "email": user_row["email"],
                "role": user_row["role"]
            }

            return self.send_json(200, {
                "success": True,
                "message": f"С возвращением, {user_row['nickname']}!",
                "user": user_data,
                "token": token
            })

        # ============================================================
        #  ВЫХОД (/api/logout)
        # ============================================================
        if path == "/api/logout":
            auth_header = self.headers.get("Authorization", "")
            token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else body.get("token")
            if token:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                conn.close()
            return self.send_json(200, {"success": True, "message": "Сессия успешно завершена"})

        return self.send_json(404, {"success": False, "error": "API-эндпоинт не найден"})


# ============================================================
#  3. ТОЧКА ВХОДА СЕРВЕРА
# ============================================================
def run():
    init_database()
    port = PORT
    server_address = ("", port)
    try:
        httpd = HTTPServer(server_address, DotaArenaRequestHandler)
    except OSError:
        port = PORT + 1
        server_address = ("", port)
        httpd = HTTPServer(server_address, DotaArenaRequestHandler)

    print("=" * 60)
    print("  DotaArena 2026 — Киберспортивный Web-сервер с базой SQLite3")
    print("=" * 60)
    print(f"  Сервер запущен:  http://localhost:{port}")
    print(f"  Страница входа:  http://localhost:{port}/login.html")
    print(f"  Главная:         http://localhost:{port}/index.html")
    print(f"  Файл базы SQLite: {DB_FILE}")
    print(f"  API эндпоинты:   /api/register, /api/login, /api/status, /api/me")
    print("=" * 60)
    print("  Для остановки сервера нажмите Ctrl + C\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nСервер остановлен пользователем.")
        httpd.server_close()


if __name__ == "__main__":
    run()
