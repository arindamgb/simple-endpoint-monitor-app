import os
import time
import requests
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

# Load env
load_dotenv()

TIMEOUT = int(os.getenv("TIMEOUT", 30))
URL_FILE = os.getenv("URL_FILE", "endpoints.txt")
MAX_WORKERS = int(os.getenv("MAX_WORKERS", 10))

app = FastAPI(title="Endpoint Health Checker", version="1.0.0")

# CORS settings (make configurable if needed)
origins = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # e.g. ["http://localhost:3000", "https://your-frontend.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EndpointResult(BaseModel):
    url: str
    result: str
    status: int | None
    time: float | None


def check_endpoint(url: str, timeout: int):
    try:
        start = time.time()
        response = requests.get(url, timeout=timeout)
        elapsed = round(time.time() - start, 2)
        return {
            "url": url,
            "status": response.status_code,
            "time": elapsed,
            "result": "UP" if elapsed <= timeout else "TIMEOUT",
        }
    except requests.exceptions.Timeout:
        return {"url": url, "status": None, "time": None, "result": "TIMEOUT"}
    except requests.exceptions.RequestException as e:
        return {
            "url": url,
            "status": None,
            "time": None,
            "result": f"DOWN ({e.__class__.__name__})",
        }


@app.get("/check-endpoints", response_model=List[EndpointResult])
def check_endpoints():
    if not os.path.exists(URL_FILE):
        return [{"url": "N/A", "result": "ERROR: URL file not found", "status": None, "time": None}]

    with open(URL_FILE, "r") as f:
        urls = [
            line.strip()
            for line in f
            if line.strip() and not line.strip().startswith("#")
        ]

    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_url = {executor.submit(check_endpoint, url, TIMEOUT): url for url in urls}
        for future in as_completed(future_to_url):
            results.append(future.result())

    return results

