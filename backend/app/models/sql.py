import enum

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OIDC-only users
    role = Column(Enum(UserRole), nullable=False, default=UserRole.user)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    reports = relationship("Report", back_populates="user")


class OIDCSetting(Base):
    __tablename__ = "oidc_settings"

    id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String, unique=True, index=True, nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    discovery_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Inverter(Base):
    __tablename__ = "inverters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, default="My Inverter")
    serial_number = Column(String, unique=True, index=True, nullable=False)
    ip_address = Column(String, nullable=False)
    port = Column(Integer, default=8484)  # Default port for Solarplanet inverters

    metrics = relationship("Metric", back_populates="inverter")


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    inverter_id = Column(Integer, ForeignKey("inverters.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Raw data from inverter
    flg = Column(Integer)
    tmp = Column(Float)  # Temperature (e.g., 37.8)
    fac = Column(Float)  # AC Frequency (e.g., 50.00)
    pac = Column(Float)  # Active AC Power (W)
    sac = Column(Float)  # Apparent AC Power (VA)
    qac = Column(Float)  # Reactive AC Power (VAR)
    eto = Column(Float)  # Total Energy Output (Wh)
    etd = Column(Float)  # Today's Energy Output (Wh)
    hto = Column(Float)  # Hours of operation (total)
    pf = Column(Float)  # Power Factor (e.g., 98)
    wan = Column(Integer)
    err = Column(Integer)

    # AC Voltages (assuming 3 phases, can be less)
    vac1 = Column(Float, nullable=True)
    vac2 = Column(Float, nullable=True)
    vac3 = Column(Float, nullable=True)

    # AC Currents (assuming 3 phases, can be less)
    iac1 = Column(Float, nullable=True)
    iac2 = Column(Float, nullable=True)
    iac3 = Column(Float, nullable=True)

    # PV Voltages (assuming 2 strings, can be less or more)
    vpv1 = Column(Float, nullable=True)
    vpv2 = Column(Float, nullable=True)

    # PV Currents (assuming 2 strings, can be less or more)
    ipv1 = Column(Float, nullable=True)
    ipv2 = Column(Float, nullable=True)

    inverter = relationship("Inverter", back_populates="metrics")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String, nullable=False) # e.g., "daily", "weekly", "monthly", "yearly"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    content = Column(String, nullable=True) # Store report content as JSON string or HTML
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who generated/requested it
    
    user = relationship("User", back_populates="reports")
