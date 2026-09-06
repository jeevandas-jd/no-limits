"""
Small, dependency-light temporal memory engine for the No Limits hackathon.

It stores the user's original text plus extracted events in a JSON file.
The extraction is intentionally conservative. It does not invent details.
Later, this module can be replaced by an LLM/graph database pipeline
without changing the frontend API.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parent / "memory_data.json"


def _load() -> list[dict[str, Any]]:
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _save(memories: list[dict[str, Any]]) -> None:
    DATA_FILE.write_text(
        json.dumps(memories, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def _relative_date(text: str, now: datetime) -> str | None:
    lower = text.lower()
    if "today" in lower:
        return now.date().isoformat()
    if "yesterday" in lower:
        return (now.date() - timedelta(days=1)).isoformat()
    if "day before yesterday" in lower:
        return (now.date() - timedelta(days=2)).isoformat()

    patterns = [
        r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b",
        r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            try:
                groups = match.groups()
                if len(groups[0]) == 4:
                    return datetime(int(groups[0]), int(groups[1]), int(groups[2])).date().isoformat()
                return datetime(int(groups[2]), int(groups[1]), int(groups[0])).date().isoformat()
            except ValueError:
                pass
    return None


def _times(text: str) -> list[str]:
    found: list[str] = []
    for match in re.finditer(r"\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)\b", text):
        hour = int(match.group(1))
        minute = int(match.group(2) or "00")
        suffix = match.group(3).upper()
        if suffix == "PM" and hour < 12:
            hour += 12
        if suffix == "AM" and hour == 12:
            hour = 0
        found.append(f"{hour:02d}:{minute:02d}")
    return found


def _people(text: str) -> list[str]:
    people: list[str] = []

    # Explicit "with X" / "met X" phrases.
    for pattern in [
        r"\bwith\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)?)",
        r"\bmet\s+(?:Dr\.?\s+)?([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)?)",
    ]:
        for match in re.finditer(pattern, text):
            value = match.group(1).strip(" .,")
            if value and value.lower() not in {p.lower() for p in people}:
                people.append(value)

    return people


def _places(text: str) -> list[str]:
    places: list[str] = []
    patterns = [
        r"\b(?:at|to|in|near)\s+(?:the\s+)?([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,3})",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            value = match.group(1).strip(" .,")
            stop = {"with", "and", "after", "before", "yesterday", "today"}
            if value and value.lower() not in stop and len(value) > 2:
                if value.lower() not in {p.lower() for p in places}:
                    places.append(value)
    return places


def _event_type(sentence: str) -> tuple[str, str]:
    lower = sentence.lower()
    rules = [
        (["hospital", "doctor", "appointment", "clinic"], "appointment", "Medical appointment"),
        (["lunch", "dinner", "breakfast", "ate", "restaurant"], "meal", "Meal"),
        (["walk", "walking"], "walk", "Walk"),
        (["shop", "shopping", "bought", "purchase"], "shopping", "Shopping"),
        (["met", "meeting"], "meeting", "Meeting"),
        (["school", "class"], "school", "School"),
        (["work", "office"], "work", "Work"),
        (["travel", "trip", "visited", "visit", "went"], "visit", "Visit"),
    ]
    for keywords, event_type, title in rules:
        if any(word in lower for word in keywords):
            return event_type, title
    return "activity", "Activity"


def extract_memory(text: str) -> dict[str, Any]:
    now = datetime.now()
    date = _relative_date(text, now)
    times = _times(text)
    people = _people(text)
    places = _places(text)

    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences:
        sentences = [text.strip()]

    events = []
    for index, sentence in enumerate(sentences):
        event_type, title = _event_type(sentence)
        event_people = [p for p in people if p.lower() in sentence.lower()]
        event_places = [p for p in places if p.lower() in sentence.lower()]
        event = {
            "id": f"event_{uuid.uuid4().hex[:10]}",
            "type": event_type,
            "title": title,
            "date": date,
            "time": times[index] if index < len(times) else (times[0] if len(times) == 1 else None),
            "location": event_places[0] if event_places else (places[0] if len(places) == 1 else None),
            "people": event_people or people,
            "activities": [event_type],
            "description": sentence,
            "memoryId": "",
        }
        events.append(event)

    memory_id = f"memory_{uuid.uuid4().hex[:10]}"
    for event in events:
        event["memoryId"] = memory_id

    entities = []
    for name in people:
        entities.append({"id": f"person_{uuid.uuid4().hex[:8]}", "name": name, "type": "person"})
    for name in places:
        entities.append({"id": f"place_{uuid.uuid4().hex[:8]}", "name": name, "type": "place"})

    return {
        "id": memory_id,
        "text": text,
        "createdAt": now.isoformat(),
        "eventDate": date,
        "events": events,
        "entities": entities,
    }


def create_memory(text: str) -> dict[str, Any]:
    memories = _load()
    memory = extract_memory(text)
    memories.append(memory)
    _save(memories)
    return memory


def all_memories() -> list[dict[str, Any]]:
    memories = _load()
    return list(reversed(memories))


def timeline(date: str | None = None) -> list[dict[str, Any]]:
    memories = all_memories()
    if not date:
        return memories
    return [m for m in memories if m.get("eventDate") == date]


def _question_date(question: str) -> str | None:
    return _relative_date(question, datetime.now())


def ask_memory(question: str) -> dict[str, Any]:
    memories = all_memories()
    lower = question.lower()
    date_filter = _question_date(question)

    candidates: list[dict[str, Any]] = []
    for memory in memories:
        if date_filter and memory.get("eventDate") != date_filter:
            continue

        haystack = memory["text"].lower()
        score = 0

        for word in re.findall(r"[a-zA-Z]{3,}", lower):
            if word in haystack:
                score += 1

        # Relationship/intent boosts.
        if "meet" in lower or "who" in lower:
            if any(e["type"] == "meeting" for e in memory["events"]):
                score += 3
        if "hospital" in lower and "hospital" in haystack:
            score += 4
        if "after" in lower:
            score += 1
        if "before" in lower:
            score += 1

        if score:
            candidates.append((score, memory))

    candidates.sort(key=lambda x: x[0], reverse=True)
    selected = [m for _, m in candidates[:5]]

    events = [e for m in selected for e in m["events"]]

    if not selected:
        return {
            "answer": "I couldn't find a recorded memory that matches that question yet.",
            "confidence": "low",
            "memories": [],
            "events": [],
        }

    # Person questions.
    if "who" in lower and ("meet" in lower or "with" in lower):
        people = []
        for event in events:
            for person in event["people"]:
                if person.lower() not in {p.lower() for p in people}:
                    people.append(person)

        if people:
            place = next((e["location"] for e in events if e["location"]), None)
            when = next((e["date"] for e in events if e["date"]), None)
            answer = f"You recorded being with or meeting {', '.join(people)}"
            if place:
                answer += f" at {place}"
            if when:
                answer += f" on {when}"
            answer += "."
        else:
            answer = "I found a matching memory, but it doesn't record a person's name."

    elif "after" in lower:
        ordered = sorted(events, key=lambda e: (e.get("date") or "", e.get("time") or "99:99"))
        if len(ordered) >= 2:
            first = ordered[0]
            second = ordered[1]
            answer = f"After {first['title'].lower()}, you recorded: {second['description']}."
        else:
            answer = selected[0]["text"]

    else:
        snippets = []
        for event in events[:4]:
            snippets.append(event["description"])
        answer = " ".join(snippets) if snippets else selected[0]["text"]

    confidence = "high" if candidates[0][0] >= 4 else "medium"
    return {
        "answer": answer,
        "confidence": confidence,
        "memories": selected,
        "events": events[:10],
    }
