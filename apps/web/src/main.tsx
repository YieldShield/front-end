import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import { App } from "./App";
import { AppProviders } from "./providers/AppProviders";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
