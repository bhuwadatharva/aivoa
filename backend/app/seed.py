from datetime import date, time, timedelta
from sqlalchemy.orm import Session
from app.models import User, HCP, Product, Competitor, Material, Interaction, FollowUp, AuditLog
from app.auth import get_password_hash

def seed_database(db: Session):
    # 1. Check if seed is already present
    user_count = db.query(User).count()
    if user_count > 0:
        print("Database already seeded. Skipping...")
        return

    print("Seeding database...")

    # 2. Create default Sales Representative User
    hashed_pw = get_password_hash("password123")
    default_user = User(
        email="rep@aivoa.com",
        hashed_password=hashed_pw,
        full_name="Alex Representative",
        role="Representative"
    )
    db.add(default_user)
    db.commit()
    db.refresh(default_user)

    # 3. Create Products
    products = [
        Product(name="Product X", therapeutic_area="Oncology", description="Next-generation oncology treatment with high survival indices."),
        Product(name="Cardivas-10", therapeutic_area="Cardiology", description="10mg beta-blocker targeting chronic heart failure."),
        Product(name="Oncolyze-B", therapeutic_area="Oncology", description="Monoclonal antibody targeting tumor cell multiplication."),
        Product(name="Gliclazide-MR", therapeutic_area="Endocrinology", description="Modified release anti-diabetic medication."),
        Product(name="Atorvastatin-A", therapeutic_area="Cardiology", description="Highly effective lipid-lowering HMG-CoA reductase inhibitor.")
    ]
    for p in products:
        db.add(p)
    db.commit()

    # 4. Create Competitors
    competitors = [
        Competitor(name="PharmaCorp Y", market_product="OncoBlock", details="Traditional chemo alternative. Lower price tier."),
        Competitor(name="Competitor Y", market_product="BetaShield", details="Cardiovascular inhibitor. High market penetration."),
        Competitor(name="Novartis", market_product="Gleevec", details="Market leader in chronic myeloid leukemia."),
        Competitor(name="Pfizer", market_product="Lipitor", details="Major competitor in statins segment.")
    ]
    for c in competitors:
        db.add(c)
    db.commit()

    # 5. Create Materials
    materials = [
        Material(name="Product Brochure", type="Brochure", url="https://aivoa.com/materials/brochure.pdf"),
        Material(name="Clinical Trial Paper", type="Clinical Paper", url="https://aivoa.com/materials/trial_results.pdf"),
        Material(name="Presentation Slides", type="Slides", url="https://aivoa.com/materials/slides.pdf"),
        Material(name="Dosage Guidelines", type="Document", url="https://aivoa.com/materials/dosage.pdf")
    ]
    for m in materials:
        db.add(m)
    db.commit()

    # 6. Create HCPs
    hcps = [
        HCP(name="Dr. Shah", specialty="Cardiology", hospital="Metro Health Center", email="dr.shah@metrohealth.com", phone="555-0143", relationship_score=75, interest_score=60, prescription_likelihood="High"),
        HCP(name="Dr. Harrison", specialty="Oncology", hospital="St. Jude Cancer Research", email="dr.harrison@stjude.org", phone="555-0182", relationship_score=85, interest_score=90, prescription_likelihood="High"),
        HCP(name="Dr. Smith", specialty="General Medicine", hospital="City Wellness Clinic", email="dr.smith@citywellness.com", phone="555-0111", relationship_score=40, interest_score=35, prescription_likelihood="Low"),
        HCP(name="Dr. Patel", specialty="Endocrinology", hospital="Endocrine Care Associates", email="dr.patel@endocrinecare.com", phone="555-0122", relationship_score=65, interest_score=50, prescription_likelihood="Medium"),
        HCP(name="Dr. Chen", specialty="Oncology", hospital="Eastern Oncology Institute", email="dr.chen@easternoncology.com", phone="555-0155", relationship_score=55, interest_score=70, prescription_likelihood="Medium")
    ]
    for h in hcps:
        db.add(h)
    db.commit()
    for h in hcps:
        db.refresh(h)

    # 7. Pre-populate some historical interactions to make charts look awesome
    # Get products, competitors, materials
    p_x = db.query(Product).filter(Product.name == "Product X").first()
    c_cardivas = db.query(Product).filter(Product.name == "Cardivas-10").first()
    c_onco = db.query(Product).filter(Product.name == "Oncolyze-B").first()
    
    comp_corp = db.query(Competitor).filter(Competitor.name == "PharmaCorp Y").first()
    
    mat_broch = db.query(Material).filter(Material.name == "Product Brochure").first()
    mat_paper = db.query(Material).filter(Material.name == "Clinical Trial Paper").first()

    h_shah = db.query(HCP).filter(HCP.name == "Dr. Shah").first()
    h_harri = db.query(HCP).filter(HCP.name == "Dr. Harrison").first()
    h_smith = db.query(HCP).filter(HCP.name == "Dr. Smith").first()

    # Interaction 1: Dr. Shah (Positive)
    int1 = Interaction(
        user_id=default_user.id,
        hcp_id=h_shah.id,
        interaction_type="In-Person",
        meeting_date=date.today() - timedelta(days=20),
        meeting_time=time(10, 30),
        attendees="Dr. Shah, Alex Representative",
        topics_discussed="Cardivas-10 efficacy study review.",
        notes="Presented Cardivas-10. Dr. Shah was highly receptive. He requested dosage guideline documents. Mentions competitor Y is cheaper but has lower half-life.",
        sentiment="Positive",
        summary="Receptive meeting on Cardivas-10. Shared brochures."
    )
    int1.products = [c_cardivas]
    int1.materials = [mat_broch]
    db.add(int1)

    # Interaction 2: Dr. Harrison (Positive)
    int2 = Interaction(
        user_id=default_user.id,
        hcp_id=h_harri.id,
        interaction_type="Video",
        meeting_date=date.today() - timedelta(days=10),
        meeting_time=time(14, 00),
        attendees="Dr. Harrison, Alex Representative",
        topics_discussed="Product X oncology trials and Oncolyze-B comparison.",
        notes="Online brief regarding survival indices. Dr. Harrison discussed PharmaCorp Y's competing drug OncoBlock. Highly interested in our oncology trial results. Requested trial paper.",
        sentiment="Positive",
        summary="Oncology review online. Shared clinical paper."
    )
    int2.products = [p_x, c_onco]
    int2.competitors = [comp_corp]
    int2.materials = [mat_paper]
    db.add(int2)

    # Interaction 3: Dr. Smith (Negative)
    int3 = Interaction(
        user_id=default_user.id,
        hcp_id=h_smith.id,
        interaction_type="In-Person",
        meeting_date=date.today() - timedelta(days=5),
        meeting_time=time(11, 15),
        attendees="Dr. Smith, Alex Representative",
        topics_discussed="General check-in.",
        notes="Physician was busy. Refused to discuss any products. Complained about drug prices and insurance approvals.",
        sentiment="Negative",
        summary="Brief meeting, refused product discussion."
    )
    db.add(int3)
    db.commit()

    # 8. Create a pending FollowUp
    f1 = FollowUp(
        interaction_id=int2.id,
        hcp_id=h_harri.id,
        title="Formulary submission for Product X",
        priority="High",
        follow_up_date=date.today() + timedelta(days=5),
        reason="Follow up on Harrison's hospital board decision for Product X inclusion.",
        status="Pending"
    )
    db.add(f1)

    # 9. Log Audit Trail
    db.add(AuditLog(
        user_id=default_user.id,
        action_type="SYSTEM_SEED",
        description="Pre-seeded database with users, HCPs, products, competitors, materials and interactions."
    ))
    db.commit()

    print("Database seeding completed successfully!")
