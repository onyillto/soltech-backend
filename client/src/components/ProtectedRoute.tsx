import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import type { Role } from "../api/types";
import { Spinner } from "./ui";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="center-screen">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <div className="empty-state" style={{ padding: "60px 20px" }}>
        You don't have access to this page with the {user?.role ?? "current"} role.
      </div>
    );
  }
  return <>{children}</>;
}
