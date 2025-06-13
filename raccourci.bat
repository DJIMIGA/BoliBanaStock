@echo off
set SCRIPT="%USERPROFILE%\Desktop\BoliBanaStock.url"
echo [InternetShortcut] > %SCRIPT%
echo URL=http://127.0.0.1:8000 >> %SCRIPT%
echo IconFile=%USERPROFILE%\Desktop\bolibanastock\app\manage.py >> %SCRIPT%
echo IconIndex=0 >> %SCRIPT% 