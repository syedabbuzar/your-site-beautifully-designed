import logoUrl from "@/assets/bombay-logo.png";
import { PoweredBy } from "@/components/app/PoweredBy";
const logo = { url: logoUrl };

export function Splash() {
  return (
    <div className="app-splash" role="status" aria-label="Bombay Suiting & Shirting is starting">
      <div className="app-splash-content">
        <img src={logo.url} alt="Bombay Suiting & Shirting" className="app-splash-logo" />
        <div className="app-splash-title">BOMBAY</div>
        <div className="app-splash-subtitle">SUITING <span>•</span> SHIRTING</div>
        <div className="app-splash-divider" />
        <PoweredBy dark className="app-splash-powered" />
      </div>
    </div>
  );
}

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return <img src={logo.url} alt="Bombay Suiting & Shirting logo" className={`${className} rounded-full object-cover`} />;
}
