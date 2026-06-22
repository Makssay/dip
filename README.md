```powershell
git clone https://github.com/Makssay/dip.git
```

```powershell
cd dip
```

```powershell
python -m venv .venv
```

```powershell
.venv\Scripts\activate
```

```powershell
pip install -r requirements.txt
```

```powershell
python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
```

```text
http://127.0.0.1:8000/
```
