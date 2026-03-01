import { Routes, Route, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ListOrdered, Database, Activity, Bell, BookOpen } from "lucide-react";
import Overview from "./pages/Overview";
import JobRuns from "./pages/JobRuns";
import DataFreshness from "./pages/DataFreshness";
import Alerts from "./pages/Alerts";
import PipelineDetail from "./pages/PipelineDetail";
import Docs from "./pages/Docs";

const nav = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/runs", label: "Job runs", icon: ListOrdered },
  { path: "/freshness", label: "Data freshness", icon: Database },
  { path: "/alerts", label: "Alerting", icon: Bell },
  { path: "/docs", label: "Docs", icon: BookOpen },
];

function Layout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <Activity className="h-6 w-6 text-[var(--accent)]" />
            Pipeline Dashboard
          </Link>
        </div>
        <nav className="p-2 flex-1">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-[var(--accent)]/20 text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/pipelines/:id" element={<PipelineDetail />} />
          <Route path="/runs" element={<JobRuns />} />
          <Route path="/freshness" element={<DataFreshness />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="*" element={<Layout />} />
    </Routes>
  );
}
