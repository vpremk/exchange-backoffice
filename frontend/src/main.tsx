import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import UploadPage from "./pages/UploadPage";
import InboxPage from "./pages/InboxPage";
import DocumentReviewPage from "./pages/DocumentReviewPage";
import DashboardPage from "./pages/DashboardPage";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5000 } },
});

function AppRoutes() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<UploadPage />} />
        <Route path="/inbox" element={
          ["VALIDATOR", "SUPERVISOR"].includes(user.role) ? <InboxPage /> : <Navigate to="/" />
        } />
        <Route path="/documents/:id" element={<DocumentReviewPage />} />
        <Route path="/dashboard" element={
          ["VALIDATOR", "SUPERVISOR"].includes(user.role) ? <DashboardPage /> : <Navigate to="/" />
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
