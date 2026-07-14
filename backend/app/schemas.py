from pydantic import BaseModel, EmailStr, Field
from datetime import date, time, datetime
from typing import List, Optional, Union
from uuid import UUID

# ==========================================
# AUTH SCHEMAS
# ==========================================
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[str] = "Representative"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

# ==========================================
# PRODUCT & COMPETITOR & MATERIAL SCHEMAS
# ==========================================
class ProductBase(BaseModel):
    name: str
    therapeutic_area: str
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True

class CompetitorBase(BaseModel):
    name: str
    market_product: str
    details: Optional[str] = None

class CompetitorCreate(CompetitorBase):
    pass

class CompetitorResponse(CompetitorBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True

class MaterialBase(BaseModel):
    name: str
    type: str # e.g. Brochure, Clinical Paper
    url: Optional[str] = None

class MaterialCreate(MaterialBase):
    pass

class MaterialResponse(MaterialBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# HCP SCHEMAS
# ==========================================
class HCPBase(BaseModel):
    name: str
    specialty: str
    hospital: str
    email: EmailStr
    phone: Optional[str] = None
    relationship_score: Optional[int] = 50
    interest_score: Optional[int] = 50
    prescription_likelihood: Optional[str] = "Medium"

class HCPCreate(HCPBase):
    pass

class HCPUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    relationship_score: Optional[int] = None
    interest_score: Optional[int] = None
    prescription_likelihood: Optional[str] = None

class HCPResponse(HCPBase):
    id: Union[UUID, str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# INTERACTION SCHEMAS
# ==========================================
class InteractionBase(BaseModel):
    hcp_id: Union[UUID, str]
    interaction_type: str
    meeting_date: date
    meeting_time: time
    attendees: Optional[str] = None
    topics_discussed: Optional[str] = None
    notes: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    summary: Optional[str] = None
    samples: Optional[str] = None

class InteractionCreate(InteractionBase):
    id: Optional[Union[UUID, str]] = None
    product_ids: Optional[List[str]] = []
    competitor_ids: Optional[List[str]] = []
    material_ids: Optional[List[str]] = []
    follow_up_date: Optional[date] = None
    follow_up_priority: Optional[str] = "Medium"
    follow_up_reason: Optional[str] = None

class InteractionResponse(InteractionBase):
    id: Union[UUID, str]
    user_id: Union[UUID, str]
    created_at: datetime
    products: List[ProductResponse] = []
    competitors: List[CompetitorResponse] = []
    materials: List[MaterialResponse] = []

    class Config:
        from_attributes = True

# ==========================================
# FOLLOW UP SCHEMAS
# ==========================================
class FollowUpBase(BaseModel):
    hcp_id: Union[UUID, str]
    interaction_id: Optional[Union[UUID, str]] = None
    title: str
    priority: Optional[str] = "Medium"
    follow_up_date: date
    reason: Optional[str] = None
    status: Optional[str] = "Pending"

class FollowUpCreate(FollowUpBase):
    pass

class FollowUpUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    follow_up_date: Optional[date] = None
    reason: Optional[str] = None
    status: Optional[str] = None

class FollowUpResponse(FollowUpBase):
    id: Union[UUID, str]
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# AI CHAT AND AUTO-EXTRACT STRUCTURES
# ==========================================
class ChatMessage(BaseModel):
    role: str # user, assistant
    content: str
    created_at: datetime = Field(default_factory=datetime.now)

class ChatInput(BaseModel):
    message: str
    hcp_id: Optional[str] = None
    context_form_data: Optional[dict] = None

class DoctorOutput(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    created: Optional[bool] = False

class HospitalOutput(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    created: Optional[bool] = False

class InteractionOutput(BaseModel):
    interaction_type: Optional[str] = "Meeting"
    topics: List[str] = []
    materials: List[str] = []
    competitors: List[str] = []
    samples: Optional[int] = 0
    sentiment: Optional[str] = "Neutral"
    follow_up: Optional[str] = None
    summary: Optional[str] = None
    notes: Optional[str] = None

class AIAgentOutputSchema(BaseModel):
    doctor: Optional[DoctorOutput] = None
    hospital: Optional[HospitalOutput] = None
    interaction: Optional[InteractionOutput] = None

class ChatResponse(BaseModel):
    message: str
    extracted_data: Optional[AIAgentOutputSchema] = None
    tool_triggered: Optional[str] = None
    tool_output: Optional[dict] = None
    compliance_warning: Optional[str] = None

# ==========================================
# DASHBOARD METRICS SCHEMAS
# ==========================================
class DashboardMetrics(BaseModel):
    total_hcps: int
    total_interactions: int
    sentiment_breakdown: dict # e.g. {"Positive": 10, "Neutral": 5, "Negative": 2}
    interactions_over_time: List[dict] # e.g. [{"month": "Jan", "count": 5}]
    top_products: List[dict] # e.g. [{"name": "Product X", "count": 8}]
    competitor_mentions: List[dict] # e.g. [{"name": "Comp Y", "count": 4}]
    pending_followups_count: int
