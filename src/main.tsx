import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const Admin = lazy(() => import("./Admin"));
const isAdmin = window.location.pathname.replace(/\/+$/, "") === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
