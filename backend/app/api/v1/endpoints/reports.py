from typing import List, Annotated, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from app import crud
from app.dependencies import get_db
from app.models.sql import User
from app.auth.dependencies import get_current_user
from app.schemas import report as report_schema
from app.services.email_service import send_email
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
)

@router.get("/", response_model=List[report_schema.Report])
async def read_reports(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve reports for the current user.
    """
    reports = await crud.get_reports(db, user_id=current_user.id, skip=skip, limit=limit)
    return reports

@router.get("/{report_id}", response_model=report_schema.Report)
async def read_report(
    report_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Retrieve a specific report for the current user.
    """
    report = await crud.get_report(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@router.post("/generate", response_model=report_schema.Report)
async def generate_report(
    report_type: str, # e.g., "daily", "weekly", "monthly", "yearly"
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Trigger generation of a new report.
    (Placeholder for actual report generation logic)
    """
    # --- Placeholder for actual report generation logic ---
    # In a real scenario, this would involve complex data aggregation
    # and formatting based on report_type and user_id.
    # For now, we'll create a dummy report.

    now = datetime.now()
    if report_type == "daily":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
        content = f"Daily report for {start_date.strftime('%Y-%m-%d')}. (Dummy content)"
    elif report_type == "weekly":
        start_date = now - timedelta(days=now.weekday()) # Monday of current week
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now
        content = f"Weekly report for week starting {start_date.strftime('%Y-%m-%d')}. (Dummy content)"
    elif report_type == "monthly":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now
        content = f"Monthly report for {start_date.strftime('%Y-%m')}. (Dummy content)"
    elif report_type == "yearly":
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now
        content = f"Yearly report for {start_date.year}. (Dummy content)"
    else:
        raise HTTPException(status_code=400, detail="Invalid report type")

    report_in = report_schema.ReportCreate(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        content=content,
    )
    report = await crud.create_report(db, report_in=report_in, user_id=current_user.id)
    return report

@router.post("/{report_id}/send-email", status_code=status.HTTP_202_ACCEPTED)
async def send_report_email(
    report_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Send a specific report via email to the current user.
    """
    report = await crud.get_report(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not current_user.email:
        raise HTTPException(status_code=400, detail="User has no email configured for sending reports.")

    subject = f"Solaris Monitor Report: {report.report_type.capitalize()} ({report.start_date.strftime('%Y-%m-%d')})"
    body = report.content or "No content available for this report."

    await send_email(recipients=[current_user.email], subject=subject, body=body)
    return {"message": "Report email sent successfully (if configured)."}

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Delete a specific report for the current user.
    """
    report = await crud.get_report(db, report_id)
    if not report or report.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await crud.delete_report(db, report_id)
    return {"message": "Report deleted successfully."}