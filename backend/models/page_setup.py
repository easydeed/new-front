from pydantic import BaseModel

class PageMargins(BaseModel):
    top: str = "0.75in"
    right: str = "0.5in"
    bottom: str = "0.5in"
    left: str = "0.5in"

class PageSetup(BaseModel):
    size: str = "Letter"
    margins: PageMargins = PageMargins()
