from fastapi import APIRouter
from models.doc_types import get_document_types_registry


router = APIRouter()


@router.get("/doc-types")
def list_doc_types():
    """Return the document type registry for frontend consumption."""
    return get_document_types_registry()


