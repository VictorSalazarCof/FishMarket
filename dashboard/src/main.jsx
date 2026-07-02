import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App.jsx";
import CriticalView from "./views/CriticalView.jsx";
import FiltersView from "./views/FiltersView.jsx";
import OverviewView from "./views/OverviewView.jsx";
import PredictiveView from "./views/PredictiveView.jsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<OverviewView />} />
            <Route path="critical" element={<CriticalView />} />
            <Route path="filters" element={<FiltersView />} />
            <Route path="predictive" element={<PredictiveView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
