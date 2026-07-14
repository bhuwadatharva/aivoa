import uuid
from sqlalchemy import Column, String, Integer, Text, Date, Time, DateTime, ForeignKey, Table, func, UUID
from sqlalchemy.orm import relationship
from app.database import Base

# Association Tables for Many-to-Many Relationships
interaction_products = Table(
    'interaction_products',
    Base.metadata,
    Column('interaction_id', UUID(as_uuid=True), ForeignKey('interactions.id', ondelete='CASCADE'), primary_key=True),
    Column('product_id', UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'), primary_key=True)
)

interaction_competitors = Table(
    'interaction_competitors',
    Base.metadata,
    Column('interaction_id', UUID(as_uuid=True), ForeignKey('interactions.id', ondelete='CASCADE'), primary_key=True),
    Column('competitor_id', UUID(as_uuid=True), ForeignKey('competitors.id', ondelete='CASCADE'), primary_key=True)
)

interaction_materials = Table(
    'interaction_materials',
    Base.metadata,
    Column('interaction_id', UUID(as_uuid=True), ForeignKey('interactions.id', ondelete='CASCADE'), primary_key=True),
    Column('material_id', UUID(as_uuid=True), ForeignKey('materials.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default='Representative')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    interactions = relationship("Interaction", back_populates="user")
    chat_histories = relationship("ChatHistory", back_populates="user")

class HCP(Base):
    __tablename__ = 'hcps'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    specialty = Column(String(100), nullable=False, index=True)
    hospital = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    department = Column(String(255), nullable=True)
    relationship_score = Column(Integer, default=50) # 0 to 100
    interest_score = Column(Integer, default=50)     # 0 to 100
    prescription_likelihood = Column(String(50), default='Medium') # Low, Medium, High
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    interactions = relationship("Interaction", back_populates="hcp", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="hcp", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = 'products'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    therapeutic_area = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interactions = relationship("Interaction", secondary=interaction_products, back_populates="products")

class Competitor(Base):
    __tablename__ = 'competitors'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False, index=True)
    market_product = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interactions = relationship("Interaction", secondary=interaction_competitors, back_populates="competitors")

class Material(Base):
    __tablename__ = 'materials'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False) # e.g. Brochure, Clinical Paper, Slides
    url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    interactions = relationship("Interaction", secondary=interaction_materials, back_populates="materials")

class Interaction(Base):
    __tablename__ = 'interactions'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    hcp_id = Column(UUID(as_uuid=True), ForeignKey('hcps.id', ondelete='CASCADE'), nullable=False)
    interaction_type = Column(String(50), nullable=False) # In-Person, Video, Email, Phone
    meeting_date = Column(Date, nullable=False)
    meeting_time = Column(Time, nullable=False)
    attendees = Column(Text, nullable=True) # Comma-separated list
    topics_discussed = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    sentiment = Column(String(20), default='Neutral') # Positive, Neutral, Negative
    summary = Column(Text, nullable=True)
    samples = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="interactions")
    hcp = relationship("HCP", back_populates="interactions")
    products = relationship("Product", secondary=interaction_products, back_populates="interactions")
    competitors = relationship("Competitor", secondary=interaction_competitors, back_populates="interactions")
    materials = relationship("Material", secondary=interaction_materials, back_populates="interactions")
    follow_ups = relationship("FollowUp", back_populates="interaction", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = 'follow_ups'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interaction_id = Column(UUID(as_uuid=True), ForeignKey('interactions.id', ondelete='SET NULL'), nullable=True)
    hcp_id = Column(UUID(as_uuid=True), ForeignKey('hcps.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    priority = Column(String(20), default='Medium') # Low, Medium, High
    follow_up_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default='Pending') # Pending, Completed, Cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    hcp = relationship("HCP", back_populates="follow_ups")
    interaction = relationship("Interaction", back_populates="follow_ups")

class ChatHistory(Base):
    __tablename__ = 'chat_history'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False) # e.g. user, assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_histories")

class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    action_type = Column(String(100), nullable=False) # e.g. CREATE_INTERACTION, COMPLIANCE_ALERT, UPDATE_HCP
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
