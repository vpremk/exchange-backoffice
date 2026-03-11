// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Compliance Sentinel Contributors

import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import TracesPage from "./pages/TracesPage";
import CompliancePage from "./pages/CompliancePage";
import CostsPage from "./pages/CostsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/traces" element={<TracesPage />} />
        <Route path="/compliance" element={<CompliancePage />} />
        <Route path="/costs" element={<CostsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}
