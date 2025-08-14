import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeCapacitor } from './utils/capacitor'

// Initialize Capacitor for mobile features
initializeCapacitor().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
