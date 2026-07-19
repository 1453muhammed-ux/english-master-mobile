@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo WordPilot v9.9.2 Firebase yuklemesi basliyor...
echo.
firebase use wordpilot-7a574
if errorlevel 1 goto error
firebase deploy --only firestore:rules,hosting
if errorlevel 1 goto error
echo.
echo WordPilot v9.9.2 basariyla yayinlandi.
pause
exit /b 0
:error
echo.
echo Yukleme tamamlanamadi. Yukaridaki hata mesajinin ekran goruntusunu gonderin.
pause
exit /b 1
