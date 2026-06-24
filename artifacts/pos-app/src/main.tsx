import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force Chrome Android to always fetch fresh files
navigator.serviceWorker?.getRegistrations().then(regs => regs.forEach(r => r.unregister()));

createRoot(document.getElementById("root")!).render(<App />);
