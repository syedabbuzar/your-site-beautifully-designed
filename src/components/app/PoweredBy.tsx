import mmLogo from "@/assets/mellowmoon-logo.png";
import mmLogoLight from "@/assets/mellowmoon-logo-light.png";

export function PoweredBy({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={`no-print flex flex-col items-center gap-1 text-center ${className}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${dark ? "text-sidebar-foreground/70" : "text-muted-foreground"}`}>Powered by</div>
      <div>
        <img src={dark ? mmLogoLight : mmLogo} alt="MellowMoon SoftTech" className="h-12 w-auto object-contain" />
      </div>
      <div className={`text-sm font-bold ${dark ? "text-sidebar-accent-foreground" : "text-foreground"}`}>MellowMoon SoftTech Pvt. Ltd.</div>
    </div>
  );
}
