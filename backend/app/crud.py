from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from typing import List, Optional

from app.auth.schemas import UserCreate
from app.auth.security import get_password_hash
from app.models.sql import Inverter, Metric, User, OIDCSetting, UserRole, Report
from app.schemas.inverter import InverterCreate, InverterUpdate
from app.schemas.metric import MetricCreate
from app.schemas.admin import UserUpdateAdmin, OIDCSettingCreateAdmin, OIDCSettingUpdateAdmin
from app.schemas.report import ReportCreate


# --- User CRUD ---

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalars().first()

async def get_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()

async def create_user(db: AsyncSession, user: UserCreate, role: UserRole = UserRole.user) -> User:
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password, role=role)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

async def update_user(db: AsyncSession, user: User, user_in: UserUpdateAdmin) -> User:
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data:
        user.hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: int) -> Optional[User]:
    user = await db.get(User, user_id)
    if user:
        await db.delete(user)
        await db.commit()
    return user


# --- OIDC Settings CRUD ---

async def get_oidc_setting(db: AsyncSession, setting_id: int) -> Optional[OIDCSetting]:
    return await db.get(OIDCSetting, setting_id)

async def get_oidc_settings(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[OIDCSetting]:
    result = await db.execute(select(OIDCSetting).offset(skip).limit(limit))
    return result.scalars().all()

async def get_active_oidc_settings(db: AsyncSession) -> List[OIDCSetting]:
    result = await db.execute(select(OIDCSetting).filter(OIDCSetting.is_active == True))
    return result.scalars().all()

async def create_oidc_setting(db: AsyncSession, setting_in: OIDCSettingCreateAdmin) -> OIDCSetting:
    db_setting = OIDCSetting(**setting_in.model_dump())
    db.add(db_setting)
    await db.commit()
    await db.refresh(db_setting)
    return db_setting

async def update_oidc_setting(db: AsyncSession, setting: OIDCSetting, setting_in: OIDCSettingUpdateAdmin) -> OIDCSetting:
    update_data = setting_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
    
    db.add(setting)
    await db.commit()
    await db.refresh(setting)
    return setting

async def delete_oidc_setting(db: AsyncSession, setting_id: int) -> Optional[OIDCSetting]:
    setting = await db.get(OIDCSetting, setting_id)
    if setting:
        await db.delete(setting)
        await db.commit()
    return setting


# --- Inverter CRUD ---

async def get_inverter(db: AsyncSession, inverter_id: int) -> Optional[Inverter]:
    result = await db.execute(select(Inverter).filter(Inverter.id == inverter_id))
    return result.scalars().first()


async def get_inverter_by_sn(db: AsyncSession, serial_number: str) -> Optional[Inverter]:
    result = await db.execute(select(Inverter).filter(Inverter.serial_number == serial_number))
    return result.scalars().first()


async def get_inverters(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Inverter]:
    result = await db.execute(select(Inverter).offset(skip).limit(limit))
    return result.scalars().all()


async def create_inverter(db: AsyncSession, inverter: InverterCreate) -> Inverter:
    db_inverter = Inverter(
        name=inverter.name,
        serial_number=inverter.serial_number,
        ip_address=inverter.ip_address,
        port=inverter.port
    )
    db.add(db_inverter)
    await db.commit()
    await db.refresh(db_inverter)
    return db_inverter


async def update_inverter(db: AsyncSession, inverter_id: int, inverter: InverterUpdate) -> Optional[Inverter]:
    db_inverter = await get_inverter(db, inverter_id)
    if db_inverter:
        update_data = inverter.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_inverter, key, value)
        db.add(db_inverter)
        await db.commit()
        await db.refresh(db_inverter)
    return db_inverter


async def delete_inverter(db: AsyncSession, inverter_id: int) -> Optional[Inverter]:
    db_inverter = await get_inverter(db, inverter_id)
    if db_inverter:
        await db.delete(db_inverter)
        await db.commit()
    return db_inverter


# --- Metric CRUD ---

async def create_metric(db: AsyncSession, metric: MetricCreate, inverter_id: int) -> Metric:
    db_metric = Metric(**metric.model_dump(), inverter_id=inverter_id)
    db.add(db_metric)
    await db.commit()
    await db.refresh(db_metric)
    return db_metric


async def get_metrics(
    db: AsyncSession,
    inverter_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Metric]:
    query = select(Metric)
    if inverter_id:
        query = query.filter(Metric.inverter_id == inverter_id)
    if start_time:
        query = query.filter(Metric.timestamp >= start_time)
    if end_time:
        query = query.filter(Metric.timestamp <= end_time)
    
    result = await db.execute(query.order_by(Metric.timestamp.desc()).offset(skip).limit(limit))
    return result.scalars().all()


async def get_latest_metric(db: AsyncSession, inverter_id: int) -> Optional[Metric]:
    result = await db.execute(
        select(Metric).filter(Metric.inverter_id == inverter_id).order_by(Metric.timestamp.desc())
    )
    return result.scalars().first()


# --- Report CRUD ---

async def create_report(db: AsyncSession, report_in: ReportCreate, user_id: Optional[int] = None) -> Report:
    db_report = Report(**report_in.model_dump(), user_id=user_id)
    db.add(db_report)
    await db.commit()
    await db.refresh(db_report)
    return db_report

async def get_report(db: AsyncSession, report_id: int) -> Optional[Report]:
    return await db.get(Report, report_id)

async def get_reports(db: AsyncSession, user_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[Report]:
    query = select(Report)
    if user_id:
        query = query.filter(Report.user_id == user_id)
    result = await db.execute(query.order_by(Report.generated_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()

async def delete_report(db: AsyncSession, report_id: int) -> Optional[Report]:
    report = await db.get(Report, report_id)
    if report:
        await db.delete(report)
        await db.commit()
    return report

async def get_energy_production(db: AsyncSession, inverter_id: int, start_time: datetime, end_time: datetime) -> float:
    # Query for the latest and earliest 'eto' (Total Energy) in the period
    # To get production, we subtract the starting eto from the ending eto.
    
    # Ending eto (max timestamp)
    end_query = select(Metric.eto).filter(
        Metric.inverter_id == inverter_id,
        Metric.timestamp >= start_time,
        Metric.timestamp <= end_time
    ).order_by(Metric.timestamp.desc()).limit(1)
    
    # Starting eto (min timestamp)
    start_query = select(Metric.eto).filter(
        Metric.inverter_id == inverter_id,
        Metric.timestamp >= start_time,
        Metric.timestamp <= end_time
    ).order_by(Metric.timestamp.asc()).limit(1)
    
    end_result = await db.execute(end_query)
    start_result = await db.execute(start_query)
    
    end_eto = end_result.scalar()
    start_eto = start_result.scalar()
    
    if end_eto is not None and start_eto is not None:
        return max(0, end_eto - start_eto)
    return 0.0

async def get_yesterday_stats(db: AsyncSession, inverter_id: int) -> float:
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    yesterday_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_end = yesterday_start.replace(hour=23, minute=59, second=59)
    return await get_energy_production(db, inverter_id, yesterday_start, yesterday_end)
