import "./ticease.css";
import NavBar from "@/components/ticease/NavBar";
import HelpNowButton from "@/components/ticease/HelpNowButton";

export const metadata = {
  title: "TicEase",
  description: "Understand your patterns. Practice your strategies. Feel supported.",
};

export default function TicEaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tic-root">
      <header className="tic-header">
        <div className="tic-header-inner">
          <span className="tic-wordmark">TicEase</span>
        </div>
      </header>
      <main className="tic-main">{children}</main>
      <HelpNowButton />
      <NavBar />
    </div>
  );
}
