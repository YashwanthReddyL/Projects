"""
main.py
=======
FastAPI application entry point.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from dotenv import load_dotenv

from routers import matches, deliveries, players, analytics, predict
from services.data_loader import get_store
from services.ml_service   import get_model

load_dotenv()

ENV     = os.getenv("ENV", "development")
IS_PROD = ENV == "production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Loading data store...")
    get_store()
    print("[Startup] Loading ML model...")
    get_model()
    print("[Startup] Ready.")
    yield


app = FastAPI(
    title="IPL Explorer API",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="127.0.0.1")

if not IS_PROD:
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(matches.router,    prefix="/api")
app.include_router(deliveries.router, prefix="/api")
app.include_router(players.router,    prefix="/api")
app.include_router(analytics.router,  prefix="/api")
app.include_router(predict.router,    prefix="/api")


@app.get("/")
def root():
    return {"status": "ok", "env": ENV}


@app.get("/health")
def health():
    store = get_store()
    model = get_model()
    return {
        "status":           "ok",
        "env":              ENV,
        "matches_loaded":   len(store.matches),
        "deliveries_loaded": len(store.deliveries),
        "players_indexed":  len(store.player_index),
        "ml_model":         "loaded" if model else "not_found",
        "ml_trained_on":    model.n_samples if model else 0,
    }
