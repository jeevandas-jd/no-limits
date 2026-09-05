"use client";

import { useState } from "react";

interface CardDef {
  id: string;
  label: string;
  text: string;
}

const CARDS: CardDef[] = [
  {
    id: "teacher",
    label: "Teacher",
    text:
      "I have Tourette syndrome. Some movements and sounds I make are involuntary. Please don't ask me to stop or draw attention to my tics. Your understanding helps me feel more comfortable.",
  },
  {
    id: "friend",
    label: "Friend",
    text:
      "Hey! I have Tourette syndrome. Sometimes I make movements or sounds that I can't fully control. You don't need to point them out or ask me to stop. Just treat me normally.",
  },
  {
    id: "family",
    label: "Family",
    text:
      "Tourette syndrome causes involuntary movements and/or sounds called tics. A supportive response is usually more helpful than repeatedly asking someone to stop.",
  },
  {
    id: "workplace",
    label: "Workplace",
    text:
      "I have Tourette syndrome, a neurological condition that causes involuntary movements or sounds called tics. I wanted to share this so it doesn't come as a surprise. I'm glad to answer questions.",
  },
  {
    id: "public",
    label: "Public",
    text:
      "I have Tourette syndrome. Some of my movements or sounds are involuntary. Thank you for your patience and understanding.",
  },
  {
    id: "travel",
    label: "Travel",
    text:
      "I have Tourette syndrome. Some of my movements or sounds are involuntary. Thank you for your patience and understanding.",
  },
];

export default function SupportPage() {
  const [fullscreenCard, setFullscreenCard] = useState<CardDef | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(card: CardDef) {
    navigator.clipboard?.writeText(card.text);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  if (fullscreenCard) {
    return (
      <div className="tic-fullscreen">
        <p>{fullscreenCard.text}</p>
        <button className="tic-btn tic-btn-quiet" style={{ background: "white", color: "var(--tic-primary-dark)" }} onClick={() => setFullscreenCard(null)}>
          Close
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="tic-page-title">Explain Tourette</h1>
      <p className="tic-page-sub">Who would you like to explain it to?</p>

      {CARDS.map((card) => (
        <div key={card.id} className="tic-card">
          <div className="tic-section-label">{card.label.toUpperCase()}</div>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 14 }}>{card.text}</p>
          <div className="tic-grid-2">
            <button className="tic-btn tic-btn-primary" onClick={() => setFullscreenCard(card)}>
              Show full screen
            </button>
            <button className="tic-btn tic-btn-secondary" onClick={() => copy(card)}>
              {copiedId === card.id ? "Copied ✓" : "Copy text"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
