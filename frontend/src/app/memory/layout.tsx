import "./memory.css";

export default function MemoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="memory-shell">{children}</div>;
}
