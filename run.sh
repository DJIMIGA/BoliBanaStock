#!/bin/bash
cd "$(dirname "$0")"
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app/manage.py migrate
python app/manage.py runserver 127.0.0.1:8000 