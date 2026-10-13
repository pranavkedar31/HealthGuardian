import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class DoctorProfileBase(BaseModel):
    specialization: str
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    hospital_name: str
    address: str
    area: str
    city: str
    state: str
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[str] = "Mon,Tue,Wed,Thu,Fri,Sat"
    available_time_start: Optional[str] = "09:00"
    available_time_end: Optional[str] = "18:00"
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    medical_registration_number: Optional[str] = None
    medical_registration_council: Optional[str] = None
    verification_status: Optional[str] = "pending"


class DoctorProfileCreate(DoctorProfileBase):
    pass


class DoctorProfileUpdate(BaseModel):
    phone: Optional[str] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    hospital_name: Optional[str] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[str] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None
    medical_registration_number: Optional[str] = None
    medical_registration_council: Optional[str] = None


class DoctorProfileOut(DoctorProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID


class DoctorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID  # doctor's user id
    doctor_profile_id: Optional[uuid.UUID] = None
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    specialization: str
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    hospital_name: str
    address: str
    area: str
    city: str
    state: str
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Optional[float] = None
    available_days: Optional[str] = None
    available_time_start: Optional[str] = None
    available_time_end: Optional[str] = None
    bio: Optional[str] = None
    profile_image: Optional[str] = None


class DoctorSearchOut(DoctorSummary):
    distance_km: Optional[float] = None
    match_priority: int = 3  # 1: same area/pincode, 2: same city, 3: nearby/other
    available_dates: list[str] = []
    available_slots_preview: list[str] = []


class AvailableSlot(BaseModel):
    slot_time: str  # e.g. "10:30 AM"
    datetime_iso: str  # ISO-8601 string
    is_available: bool = True
