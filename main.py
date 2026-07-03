from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api import cycles, symptoms, users
from db.session import Base, engine

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def read_root():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

app.include_router(cycles.router, prefix="/cycles", tags=["cycles"])
app.include_router(symptoms.router, prefix="/symptoms", tags=["symptoms"])
app.include_router(users.router, prefix="/users", tags=["users"])
