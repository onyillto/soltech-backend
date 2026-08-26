import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "./Logo";
import { Topbar } from "./Topbar";
import { useAuth } from "../state/AuthContext";
import { NAV_ITEMS } from "../nav";
import { ROLE_LABELS } from "../lib/format";

export function Shell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <div>
            <span className="brand-name">SOLTECH</span>
            <span className="brand-tag">Cold Chain &amp; VET Hub</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="name">{user?.name}</span>
            <span className="email">
              {user?.email} · {user ? ROLE_LABELS[user.role] : ""}
            </span>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={logout} style={{ width: "100%" }}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <Topbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
