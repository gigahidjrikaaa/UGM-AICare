# backend/app/routes/appointments.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session as DBSession
from typing import List, Dict, Optional
from datetime import datetime, date, time, timedelta # Ensure all are imported

from app import schemas, models # Assuming schemas and models are in app level
from app.database import get_db
from app.dependencies import get_current_active_user # Use your existing dependency
from app.models import AppointmentStatus # Assuming you have this enum defined in your models

# LISK_PAYMENT_CONTRACT_ADDRESS should be configured, e.g., from environment variables
LISK_PAYMENT_CONTRACT_ADDRESS = "lisk_contract_address_placeholder" # Replace with actual or env var

router = APIRouter(
    prefix="/api/v1/appointments", # Matches your frontend structure for /appointments page
    tags=["Appointments & Scheduling"],
    dependencies=[Depends(get_current_active_user)] # Protect all appointment routes
)

# --- Helper function to parse work_hours_json and generate slots ---
# (This is a simplified version for the hackathon)
def generate_daily_slots(
    target_date: date, 
    work_hours_json: Optional[str], 
    duration_minutes: int,
    booked_slots: List[datetime] # List of start times for already booked appointments on that day
) -> List[schemas.TimeSlot]:
    available_slots = []
    if not work_hours_json:
        return []

    import json
    try:
        work_hours_daily = json.loads(work_hours_json)
    except json.JSONDecodeError:
        return []

    day_name = target_date.strftime("%A").lower() # e.g., "monday"
    day_schedule = work_hours_daily.get(day_name, [])

    for period in day_schedule: # e.g., "09:00-12:00"
        try:
            start_str, end_str = period.split('-')
            period_start_time = datetime.strptime(start_str, "%H:%M").time()
            period_end_time = datetime.strptime(end_str, "%H:%M").time()

            current_slot_start_dt = datetime.combine(target_date, period_start_time)
            period_end_dt = datetime.combine(target_date, period_end_time)
            
            slot_duration = timedelta(minutes=duration_minutes)

            while current_slot_start_dt + slot_duration <= period_end_dt:
                slot_time_str = current_slot_start_dt.strftime("%H:%M")
                is_booked = any(
                    booked_dt.hour == current_slot_start_dt.hour and booked_dt.minute == current_slot_start_dt.minute
                    for booked_dt in booked_slots
                )
                # Also check if current_slot_start_dt is in the past relative to now
                is_past = datetime.combine(target_date, current_slot_start_dt.time()) < datetime.now() if target_date == date.today() else False

                available_slots.append(schemas.TimeSlot(
                    time=slot_time_str,
                    available=not is_booked and not is_past
                ))
                current_slot_start_dt += slot_duration
        except ValueError:
            continue # Skip malformed periods
            
    return available_slots


@router.get("/counselors", response_model=List[schemas.Counselor])
async def get_counselors(db: DBSession = Depends(get_db)):
    counselors = db.query(models.Counselor).filter(models.Counselor.is_generally_available == True).all()
    return counselors

@router.get("/appointment-types", response_model=List[schemas.AppointmentType])
async def get_appointment_types(db: DBSession = Depends(get_db)):
    types = db.query(models.AppointmentType).all()
    return types

@router.get("/counselors/{counselor_id}/availability", response_model=schemas.AvailabilityResponse)
async def get_counselor_availability(
    counselor_id: int,
    target_date_str: date = Query(..., alias="date", description="Target date in YYYY-MM-DD format"), # Use 'date' alias
    appointment_type_id: Optional[int] = Query(None, description="Specify to get slots for specific duration"),
    db: DBSession = Depends(get_db)
):
    counselor = db.query(models.Counselor).filter(models.Counselor.id == counselor_id).first()
    if not counselor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Counselor not found")

    # Determine duration: from appointment_type_id or a default
    duration_minutes = 60 # Default duration
    if appointment_type_id:
        appt_type = db.query(models.AppointmentType).filter(models.AppointmentType.id == appointment_type_id).first()
        if appt_type:
            duration_minutes = appt_type.duration_minutes
        else: # an explicit type_id was passed but not found
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment type not found, cannot determine slot duration.")


    # Fetch already booked appointments for this counselor on the target_date
    booked_appointments_on_date = db.query(models.Appointment.appointment_datetime)\
        .filter(
            models.Appointment.counselor_id == counselor_id,
            models.Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT]), # Consider pending as booked
            func.date(models.Appointment.appointment_datetime) == target_date_str
        ).all()
    
    booked_slots_times = [appt[0] for appt in booked_appointments_on_date]

    time_slots = generate_daily_slots(
        target_date_str, 
        counselor.work_hours_json, 
        duration_minutes, # Pass the actual duration
        booked_slots_times
    )
    return schemas.AvailabilityResponse(date=target_date_str, slots=time_slots)


@router.post("/initiate", response_model=schemas.AppointmentInitiateResponse, status_code=status.HTTP_201_CREATED)
async def initiate_appointment(
    request: schemas.AppointmentCreateRequest,
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    counselor = db.query(models.Counselor).filter(models.Counselor.id == request.counselor_id).first()
    if not counselor or not counselor.is_generally_available:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected counselor not found or unavailable.")

    appointment_type = db.query(models.AppointmentType).filter(models.AppointmentType.id == request.appointment_type_id).first()
    if not appointment_type:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected appointment type not found.")

    try:
        slot_time_obj = datetime.strptime(request.appointment_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid time format. Use HH:MM.")

    appointment_datetime = datetime.combine(request.appointment_date, slot_time_obj)
    
    # Basic check: Ensure appointment is in the future
    if appointment_datetime <= datetime.now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment date/time must be in the future.")

    # Check if slot is actually available (more robust check needed matching generate_daily_slots logic)
    # For now, we'll assume frontend selection is based on available slots.
    # A more robust check would re-validate availability against counselor.work_hours_json and existing appointments.
    existing_appointment = db.query(models.Appointment).filter(
        models.Appointment.counselor_id == request.counselor_id,
        models.Appointment.appointment_datetime == appointment_datetime,
        models.Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT])
    ).first()
    if existing_appointment:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This time slot is no longer available.")

    db_appointment = models.Appointment(
        student_user_id=current_user.id,
        counselor_id=request.counselor_id,
        appointment_type_id=request.appointment_type_id,
        appointment_datetime=appointment_datetime,
        notes_for_counselor=request.notes_for_counselor,
        status=AppointmentStatus.PENDING_PAYMENT # Initial status
    )
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)

    return schemas.AppointmentInitiateResponse(
        appointment_id=db_appointment.id,
        student_user_id=db_appointment.student_user_id,
        counselor_id=db_appointment.counselor_id,
        appointment_type_id=db_appointment.appointment_type_id,
        appointment_datetime=db_appointment.appointment_datetime,
        status=db_appointment.status,
        price_to_pay_idrx_wei=appointment_type.price_idrx_wei,
        payment_address=LISK_PAYMENT_CONTRACT_ADDRESS, # Send contract address
        notes_for_counselor=db_appointment.notes_for_counselor
    )


@router.post("/{appointment_id}/verify-payment", response_model=schemas.Appointment)
async def verify_appointment_payment(
    appointment_id: int,
    # request: schemas.AppointmentPaymentVerificationRequest, # If you pass txn_hash from frontend
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_appointment = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.student_user_id == current_user.id # Ensure user owns appointment
    ).first()

    if not db_appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    
    if db_appointment.status == AppointmentStatus.CONFIRMED:
        # Use a nested schema to return full details if needed by frontend
        return db_appointment # Already confirmed

    if db_appointment.status != AppointmentStatus.PENDING_PAYMENT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Appointment is not pending payment. Current status: {db_appointment.status.value}")

    # --- LISK BLOCKCHAIN VERIFICATION LOGIC ---
    # This is where you'll use a Lisk client (e.g., lisk-service-client or direct API calls)
    # to query your smart contract or Lisk transactions.
    # 1. Get the expected price from db_appointment.appointment_type.price_idrx_wei
    # 2. Query your Lisk Payment Smart Contract:
    #    Call `getPaymentDetails(appointmentId=appointment_id)` on your contract.
    #    It should return if paid, who paid, and how much.
    #    OR, listen for/query `PaymentReceived` events from your contract for this appointment_id.
    # 3. Verify:
    #    - Payment was made for `db_appointment.id`.
    #    - Payer was `current_user.lisk_address` (if you store user Lisk addresses).
    #    - Amount paid matches `db_appointment.appointment_type.price_idrx_wei`.

    # For Hackathon: Simulate successful verification for now
    payment_verified_on_lisk = True # Replace with actual Lisk check
    lisk_txn_hash_from_chain = "simulated_lisk_txn_hash_" + str(appointment_id) # Replace
    price_paid_from_chain = db_appointment.appointment_type.price_idrx_wei # Assume correct amount paid

    if payment_verified_on_lisk:
        db_appointment.status = AppointmentStatus.CONFIRMED
        db_appointment.lisk_transaction_hash = lisk_txn_hash_from_chain
        db_appointment.price_paid_idrx_wei = price_paid_from_chain # Store the actual amount paid
        db.commit()
        db.refresh(db_appointment)
        # TODO: Send confirmation email/notification
        return db_appointment
    else:
        # If payment not found on chain after a reasonable time
        # For now, we'll just raise an error. Frontend might retry this endpoint.
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Payment not confirmed on Lisk blockchain yet. Please try again shortly or ensure payment was successful.")

@router.get("/my", response_model=List[schemas.Appointment])
async def get_my_appointments(
    db: DBSession = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    appointments = db.query(models.Appointment)\
        .filter(models.Appointment.student_user_id == current_user.id)\
        .order_by(models.Appointment.appointment_datetime.desc())\
        .all()
    return appointments