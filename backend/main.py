from fastapi import FastAPI

app = FastAPI(title="Lead Desk API", version="0.1.0")


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Lead Desk API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

