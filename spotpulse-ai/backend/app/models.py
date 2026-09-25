from sqlalchemy import Column, Integer, String, JSON
from app.db import Base

class Venue(Base):
    __tablename__ = "venues"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String, default="")
    data = Column(JSON, default={})
