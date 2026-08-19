import { NavLink, Link, Outlet, useNavigate } from "react-router";
import { Upload, LayoutList, FolderOpen, Palette, KeyRound, LogOut } from "lucide-react";
import { apiLogout } from "@/lib/api";

const NAV = [
  { to: "/", label: "Drop", icon: Upload, end: true },
  { to: "/jobs", label: "Jobs", icon: LayoutList, end: false },
  { to: "/files", label: "Files", icon: FolderOpen, end: false },
  { to: "/brand", label: "Brand Kit", icon: Palette, end: false },
  { to: "/vault", label: "Vault", icon: KeyRound, end: false },
];

function Brand() {
  return (
    <Link to="/" className="block">
      <span className="font-display text-lg font-bold tracking-tight">
        MO&rsquo;S DROP<span className="text-primary">.</span>
      </span>
      <span className="micro-label mt-1 block">Footage in · edits out</span>
    </Link>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const logout = async () => {
    await apiLogout();
    navigate(0);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-[2px] px-3 py-2 text-sm transition-colors duration-300 ${
      isActive ? "text-white" : "text-white/45 hover:text-white/85"
    }`;

  const indicator = (isActive: boolean) => (
    <span
      className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-300 ${
        isActive ? "bg-primary opacity-100" : "opacity-0"
      }`}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r border-white/10 px-4 py-7 md:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav className="mt-10 flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              {({ isActive }) => (
                <>
                  {indicator(isActive)}
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="micro-label mt-auto flex items-center gap-2 px-3 py-2 text-left transition-colors hover:text-white/70"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          Log out
        </button>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/95 px-5 pb-3 pt-5 backdrop-blur-sm md:hidden">
        <Brand />
        <nav className="mt-4 flex gap-1 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  isActive
                    ? "border-primary/60 text-primary"
                    : "border-white/10 text-white/50"
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="md:pl-52">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 md:px-10 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
