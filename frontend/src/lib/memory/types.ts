export type MemoryEntity = {
  id: string;
  name: string;
  type: "person" | "place" | "activity" | "event" | "object";
};

export type MemoryEvent = {
  id: string;
  type: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  people: string[];
  activities: string[];
  description: string;
  memoryId: string;
};

export type Memory = {
  id: string;
  text: string;
  createdAt: string;
  eventDate: string | null;
  events: MemoryEvent[];
  entities: MemoryEntity[];
};

export type MemoryAnswer = {
  answer: string;
  confidence: "high" | "medium" | "low";
  memories: Memory[];
  events: MemoryEvent[];
};
