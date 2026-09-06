from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from memory_service import all_memories, ask_memory, create_memory, timeline


router = APIRouter(prefix="/api/memory", tags=["memory"])


class CreateMemoryRequest(BaseModel):
    text: str


class AskMemoryRequest(BaseModel):
    question: str


@router.post("")
def add_memory(payload: CreateMemoryRequest):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Memory text cannot be empty.")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Memory is too long.")
    return create_memory(text)


@router.post("/ask")
def ask(payload: AskMemoryRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    return ask_memory(question)


@router.get("/timeline")
def get_timeline(date: Optional[str] = None):
    return timeline(date)


@router.get("")
def get_memories():
    return all_memories()


@router.get("/{memory_id}")
def get_memory(memory_id: str):
    for memory in all_memories():
        if memory["id"] == memory_id:
            return memory
    raise HTTPException(status_code=404, detail="Memory not found.")
