import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/",
    end: true,
    label: "Resumen general",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="8" rx="1.5" />
        <rect x="11" y="3" width="6" height="5" rx="1.5" />
        <rect x="11" y="10" width="6" height="7" rx="1.5" />
        <rect x="3" y="13" width="6" height="4" rx="1.5" />
      </svg>
    ),
  },
  {
    to: "/critical",
    label: "Pedidos críticos",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2 18 16H2z" strokeLinejoin="round" />
        <path d="M10 8v3.5" />
        <circle cx="10" cy="13.6" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: "/filters",
    label: "Filtro específico",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 5h14M6 10h8M9 15h2" />
      </svg>
    ),
  },
  {
    to: "/predictive",
    label: "Reportes predictivos",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14l4-5 3 3 5-7 2 2" />
        <path d="M13 3h4v4" opacity="0.5" strokeDasharray="2 2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <nav className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col gap-6 bg-slate-800 px-4 py-6" aria-label="Navegación principal">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-display text-[11px] font-extrabold text-white">
          G10
        </span>
        <span className="font-display text-sm font-bold text-white">Reportería</span>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item, i) => (
          <li key={item.to} className="animate-rise-in" style={{ animationDelay: `${i * 40}ms` }}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-900/30"
                    : "text-slate-400 hover:translate-x-0.5 hover:bg-slate-700/60 hover:text-white"
                }`
              }
            >
              <span className="flex h-[18px] w-[18px] flex-shrink-0 [&>svg]:h-full [&>svg]:w-full" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto px-2 text-[10px] text-slate-500">FishMarket Cloud · Grupo G10</div>
    </nav>
  );
}
