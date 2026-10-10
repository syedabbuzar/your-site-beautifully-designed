import logoUrl from "@/assets/bombay-logo.png";
const logo = { url: logoUrl };

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <img src={logo.url} alt="Bombay Suiting & Shirting" className="h-24 w-24 animate-pulse rounded-full" />
    </div>
  );
}

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return <img src={logo.url} alt="Bombay Suiting & Shirting logo" className={`${className} rounded-full object-cover`} />;
}
