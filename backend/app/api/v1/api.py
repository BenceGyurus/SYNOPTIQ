from fastapi import APIRouter

from app.api.v1.endpoints import metrics, inverters, reports

api_router = APIRouter()

api_router.include_router(metrics.router)
api_router.include_router(inverters.router)
api_router.include_router(reports.router)
