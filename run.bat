@echo off
cd /d %~dp0
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
python app/manage.py migrate
python app/manage.py runserver 127.0.0.1:8000
pause 