from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import Dict, Any, List
from app.database import get_db
from app.models import HCP, Interaction, Product, Competitor, FollowUp, User
from app.auth import get_current_user
from app.schemas import DashboardMetrics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_hcps = db.query(HCP).count()
    total_interactions = db.query(Interaction).count()
    
    # Sentiment breakdown
    sentiments = db.query(Interaction.sentiment, func.count(Interaction.id))\
                   .group_by(Interaction.sentiment).all()
    sentiment_breakdown = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for s, c in sentiments:
        if s in sentiment_breakdown:
            sentiment_breakdown[s] = c
            
    # Interactions over the last 180 days (grouped by month in Python)
    six_months_ago = date.today() - timedelta(days=180)
    intrs = db.query(Interaction.meeting_date).filter(Interaction.meeting_date >= six_months_ago).all()
    
    # Sort months in order
    months_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    months_map = {}
    for (m_date,) in intrs:
        m_str = m_date.strftime("%b")
        months_map[m_str] = months_map.get(m_str, 0) + 1
        
    interactions_over_time = []
    # Collect months in chronological order
    current_month_index = date.today().month - 1
    # Gather last 6 months list
    last_6_months = [months_order[(current_month_index - i) % 12] for i in range(5, -1, -1)]
    
    for m in last_6_months:
        interactions_over_time.append({
            "month": m,
            "count": months_map.get(m, 0)
        })

    # Top products discussed
    products = db.query(Product).all()
    top_products = []
    for p in products:
        c = db.query(Interaction).filter(Interaction.products.contains(p)).count()
        top_products.append({"name": p.name, "count": c})
    top_products = sorted(top_products, key=lambda x: x["count"], reverse=True)[:5]
    
    # Make sure we don't return only 0s if database is empty - return mock standard portfolios for dynamic dashboard view
    if sum(p["count"] for p in top_products) == 0:
        top_products = [
            {"name": "Product X", "count": 0},
            {"name": "Cardivas-10", "count": 0},
            {"name": "Oncolyze-B", "count": 0}
        ]
        
    # Competitor mentions
    competitors = db.query(Competitor).all()
    competitor_mentions = []
    for comp in competitors:
        c = db.query(Interaction).filter(Interaction.competitors.contains(comp)).count()
        competitor_mentions.append({"name": comp.name, "count": c})
    competitor_mentions = sorted(competitor_mentions, key=lambda x: x["count"], reverse=True)[:5]
    if sum(c["count"] for c in competitor_mentions) == 0:
        competitor_mentions = [
            {"name": "PharmaCorp Y", "count": 0},
            {"name": "Competitor Y", "count": 0}
        ]
        
    pending_followups_count = db.query(FollowUp).filter(FollowUp.status == "Pending").count()
    
    return {
        "total_hcps": total_hcps,
        "total_interactions": total_interactions,
        "sentiment_breakdown": sentiment_breakdown,
        "interactions_over_time": interactions_over_time,
        "top_products": top_products,
        "competitor_mentions": competitor_mentions,
        "pending_followups_count": pending_followups_count
    }
