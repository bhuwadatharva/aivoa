from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import HCP, AuditLog, User
from app.schemas import HCPCreate, HCPResponse, HCPUpdate
from app.auth import get_current_user
from app.ai.tools import hcp_insight_generator

router = APIRouter(prefix="/api/hcps", tags=["hcps"])

@router.get("", response_model=List[HCPResponse])
def get_hcps(
    search: Optional[str] = Query(None, description="Search by doctor name or specialty"),
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    sort_by: Optional[str] = Query("name", description="Sort by field"),
    order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(HCP)
    
    if search:
        query = query.filter(
            (HCP.name.ilike(f"%{search}%")) | 
            (HCP.specialty.ilike(f"%{search}%")) |
            (HCP.hospital.ilike(f"%{search}%"))
        )
        
    if specialty:
        query = query.filter(HCP.specialty.ilike(f"%{specialty}%"))
        
    # Sorting
    if sort_by == "relationship_score":
        sort_attr = HCP.relationship_score
    elif sort_by == "interest_score":
        sort_attr = HCP.interest_score
    elif sort_by == "specialty":
        sort_attr = HCP.specialty
    else:
        sort_attr = HCP.name

    if order == "desc":
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())
        
    return query.offset(skip).limit(limit).all()

@router.post("", response_model=HCPResponse, status_code=status.HTTP_201_CREATED)
def create_hcp(
    hcp_in: HCPCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if duplicate email
    existing = db.query(HCP).filter(HCP.email == hcp_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="HCP email already exists")

    hcp = HCP(**hcp_in.model_dump())
    db.add(hcp)
    db.commit()
    db.refresh(hcp)

    # Log action
    db.add(AuditLog(
        user_id=current_user.id,
        action_type="CREATE_HCP",
        description=f"Created HCP profile for {hcp.name}."
    ))
    db.commit()

    return hcp

@router.get("/{hcp_id}", response_model=HCPResponse)
def get_hcp(
    hcp_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")
    return hcp

@router.put("/{hcp_id}", response_model=HCPResponse)
def update_hcp(
    hcp_id: str,
    hcp_in: HCPUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    update_data = hcp_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hcp, field, value)

    db.commit()
    db.refresh(hcp)

    db.add(AuditLog(
        user_id=current_user.id,
        action_type="UPDATE_HCP",
        description=f"Updated HCP profile fields for {hcp.name}: {list(update_data.keys())}."
    ))
    db.commit()

    return hcp

@router.delete("/{hcp_id}")
def delete_hcp(
    hcp_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=404, detail="HCP not found")

    db.delete(hcp)
    db.commit()

    db.add(AuditLog(
        user_id=current_user.id,
        action_type="DELETE_HCP",
        description=f"Deleted HCP profile: {hcp.name}."
    ))
    db.commit()

    return {"message": f"Successfully deleted HCP {hcp.name}"}

@router.get("/{hcp_id}/insights")
def get_hcp_insights(
    hcp_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insights = hcp_insight_generator(db, hcp_id)
    if "error" in insights:
        raise HTTPException(status_code=404, detail=insights["error"])
    return insights
