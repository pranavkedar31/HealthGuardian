import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.doctor import AvailableSlot, DoctorSearchOut, DoctorSummary
from app.services.doctor_service import DoctorService

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=list[DoctorSearchOut])
def search_doctors(
    search: Optional[str] = Query(None, description="Search by doctor name, hospital, specialization or locality"),
    specialization: Optional[str] = Query(None, description="Filter by specialization"),
    city: Optional[str] = Query(None, description="Patient city"),
    area: Optional[str] = Query(None, description="Patient area / locality"),
    pincode: Optional[str] = Query(None, description="Patient pincode"),
    latitude: Optional[float] = Query(None, description="Patient latitude for proximity sorting"),
    longitude: Optional[float] = Query(None, description="Patient longitude for proximity sorting"),
    availability: Optional[str] = Query(None, description="'today' or 'tomorrow'"),
    db: Session = Depends(get_db),
):
    service = DoctorService(db)
    return service.search_doctors(
        search=search,
        specialization=specialization,
        city=city,
        area=area,
        pincode=pincode,
        patient_lat=latitude,
        patient_lon=longitude,
        availability=availability,
    )


@router.get("/specializations", response_model=list[str])
def get_specializations(db: Session = Depends(get_db)):
    return DoctorService(db).get_specializations()


@router.get("/{doctor_id}", response_model=DoctorSummary)
def get_doctor(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    return DoctorService(db).get_doctor_details(doctor_id)


@router.get("/{doctor_id}/available-slots", response_model=list[AvailableSlot])
def get_available_slots(
    doctor_id: uuid.UUID,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
):
    return DoctorService(db).get_available_slots(doctor_id, date)
