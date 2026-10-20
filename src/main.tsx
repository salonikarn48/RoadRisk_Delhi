import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import CoverPage from "./pages/CoverPage";
import SelectAreaPage from "./pages/SelectAreaPage";
import LiveFeedPage from "./pages/LiveFeedPage";
import BestFixesPage from "./pages/BestFixesPage";
import ReportsPage from "./pages/ReportsPage";
import AssumptionsPage from "./pages/AssumptionsPage";
import App from "./App";
import { AppStateProvider } from "./context/AppStateContext";
import "leaflet/dist/leaflet.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AppStateProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<CoverPage />} />
        <Route path="/dashboard" element={<App />} />
        <Route path="/select-area" element={<SelectAreaPage />} />
        <Route path="/live-feed" element={<LiveFeedPage />} />
        <Route path="/best-fixes" element={<BestFixesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/assumptions" element={<AssumptionsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </AppStateProvider>
);
