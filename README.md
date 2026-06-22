``
git clone https://github.com/Makssay/dip.git
cd dip
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
``
