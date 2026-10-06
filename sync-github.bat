@echo off
chcp 65001 >nul
echo ============================================================
echo   DotaArena 2026 — Синхронизация проекта с GitHub
echo ============================================================
echo.

set GIT_PATH=git
where git >nul 2>nul
if %errorlevel% neq 0 (
  if exist "C:\Program Files\Git\cmd\git.exe" set GIT_PATH="C:\Program Files\Git\cmd\git.exe"
  if exist "C:\Users\wtt\AppData\Local\Programs\Git\cmd\git.exe" set GIT_PATH="C:\Users\wtt\AppData\Local\Programs\Git\cmd\git.exe"
)

echo [1/3] Упаковка актуального архива на Рабочий стол...
powershell -Command "Compress-Archive -Path '%~dp0*' -DestinationPath '%USERPROFILE%\Desktop\DotaArena2026.zip' -Force"
echo Архив DotaArena2026.zip обновлён на Рабочем столе.
echo.

echo [2/3] Фиксация изменений в Git...
%GIT_PATH% add .
%GIT_PATH% commit -m "Update project: 127 heroes, full dossier modals, PR-08 completed"

echo.
echo [3/3] Отправка изменений на GitHub...
%GIT_PATH% push origin main

if %errorlevel% equ 0 (
  echo.
  echo [УСПЕХ] Проект успешно отправлен на GitHub!
  echo Теперь на ноутбуке можно скачать обновлённый архив или сделать git pull.
) else (
  echo.
  echo [ВНИМАНИЕ] Не удалось отправить через git push. Проверьте авторизацию GitHub.
)

echo.
pause
