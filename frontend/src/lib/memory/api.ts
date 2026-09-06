import type { Memory, MemoryAnswer } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return response.json();
}

export function createMemory(text: string) {
  return request<Memory>("/api/memory", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function askMemory(question: string) {
  return request<MemoryAnswer>("/api/memory/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function getTimeline(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<Memory[]>("/api/memory/timeline" + query);
}

export function getMemory(id: string) {
  return request<Memory>(`/api/memory/${encodeURIComponent(id)}`);
}
