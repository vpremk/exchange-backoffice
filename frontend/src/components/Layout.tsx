import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/", label: "Upload", roles: ["SUBMITTER", "VALIDATOR", "SUPERVISOR"] },
  { to: "/inbox", label: "Inbox", roles: ["VALIDATOR", "SUPERVISOR"] },
  { to: "/dashboard", label: "Dashboard", roles: ["VALIDATOR", "SUPERVISOR"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="font-bold text-lg tracking-tight">Enterprise BackOffice</h1>
          <nav className="flex gap-1">
            {NAV.filter((n) => user && n.roles.includes(user.role)).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={`px-3 py-1 rounded text-sm ${
                  location.pathname === n.to
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300">
            {user?.name}{" "}
            <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded">{user?.role}</span>
          </span>
          <button onClick={logout} className="text-slate-400 hover:text-white">
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
