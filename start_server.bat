@echo off
chcp 65001 >nul
title DotaArena 2026 - Сервер с базой данных SQLite3
echo ============================================================
echo   Запуск киберспортивного сервера DotaArena 2026
echo   База данных: SQLite3 (database.db)
echo ============================================================
echo.
echo Открытие сайта в браузере...
start http://localhost:8000/login.html
echo.
echo Сервер слушает порт 8000.
echo Для остановки сервера закройте это окно или нажмите Ctrl+C.
echo.
py server.py
pause
