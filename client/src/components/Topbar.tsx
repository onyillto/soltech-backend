import { useEffect, useState } from "react";
import { Badge } from "./ui";
import { API_BASE } from "../api/client";

export function Topbar() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/health`)
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="topbar">
      <div>
        <h1>SOLTECH Hub Console</h1>
        <div className="subtitle">Off-grid cold chain operations</div>
      </div>
      {status === "online" && <Badge tone="green">API connected</Badge>}
      {status === "offline" && <Badge tone="red">API unreachable</Badge>}
      {status === "checking" && <Badge tone="muted">Checking…</Badge>}
    </div>
  );
}
