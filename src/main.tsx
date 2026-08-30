import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Admin from "./Admin";
import { isAdminPage } from "./isAdminPage";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdminPage() ? <Admin /> : <App />}</StrictMode>,
);
