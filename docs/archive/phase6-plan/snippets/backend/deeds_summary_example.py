# Example FastAPI endpoint for /deeds/summary using SQLAlchemy (pseudo-code)
from fastapi import APIRouter, Depends
router = APIRouter()

@router.get('/deeds/summary')
def deeds_summary(user_id: int = Depends(get_current_user_id)):
    # rows = db.session.query(Deed.status, func.count(Deed.id)).filter(Deed.user_id==user_id).group_by(Deed.status).all()
    counts = {'completed': 0, 'in_progress': 0, 'draft': 0}
    total = sum(counts.values())
    return {'total': total, 'completed': counts['completed'], 'in_progress': counts['in_progress'], 'month': counts['completed']}
