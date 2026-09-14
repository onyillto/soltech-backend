import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext";
import { ToastProvider } from "./state/ToastContext";
import { RequireAuth } from "./components/ProtectedRoute";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { BasketsPage } from "./pages/BasketsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { TelemetryPage } from "./pages/TelemetryPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <RequireAuth>
                  <Shell />
                </RequireAuth>
              }
            >
              <Route path="/" element={<OverviewPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/baskets" element={<BasketsPage />} />
              <Route path="/telemetry" element={<TelemetryPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
