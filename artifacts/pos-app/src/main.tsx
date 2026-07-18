import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { startSyncEngine } from "./lib/sync-engine";

startSyncEngine();

createRoot(document.getElementById("root")!).render(<App />);
