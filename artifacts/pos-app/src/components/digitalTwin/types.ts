// Sprint 1 — Digital Twin Proof of Concept types

export type TimeOfDay = "day" | "night";

export interface HotspotDef {
  id: string;
  title: string;
  position: { x: number; y: number };
  status: "online" | "busy" | "offline" | "maintenance";
  metric: string;
  metricLabel: string;
  icon: string;
}

export interface DigitalTwinState {
  timeOfDay: TimeOfDay;
  transitionProgress: number;
  hotspots: HotspotDef[];
  activeHotspot: string | null;
  lastUpdated: number;
  ambientBrightness: number;
  ambientContrast: number;
  ambientSaturation: number;
  ambientGlow: number;
  cameraX: number;
  cameraY: number;
  cameraScale: number;
  parallaxBgX: number;
  parallaxBgY: number;
  parallaxCityX: number;
  parallaxCityY: number;
  parallaxGlowX: number;
  parallaxGlowY: number;
  parallaxBuildingX: number;
  parallaxBuildingY: number;
  reducedMotion: boolean;
  gameTime: number;
}

export type DigitalTwinAction =
  | { type: "SET_TIME_OF_DAY"; payload: TimeOfDay }
  | { type: "SET_TRANSITION_PROGRESS"; payload: number }
  | { type: "SELECT_HOTSPOT"; payload: string | null }
  | { type: "UPDATE_METRICS"; payload: Partial<Pick<DigitalTwinState, "lastUpdated" | "ambientBrightness" | "ambientContrast" | "ambientSaturation" | "ambientGlow" | "gameTime">> }
  | { type: "CAMERA_TICK"; payload: { x: number; y: number; scale: number } }
  | { type: "PARALLAX_TICK"; payload: { bgX: number; bgY: number; cityX: number; cityY: number; glowX: number; glowY: number; buildingX: number; buildingY: number } }
  | { type: "SET_REDUCED_MOTION"; payload: boolean };

export interface DigitalTwinContextValue {
  state: DigitalTwinState;
  dispatch: React.Dispatch<DigitalTwinAction>;
  toggleTimeOfDay: () => void;
  selectHotspot: (id: string | null) => void;
}

// Mock data — will be replaced by realtime websocket later
export const MOCK_HOTSPOTS: HotspotDef[] = [
  { id: "pos", title: "POS", position: { x: 15, y: 65 }, status: "online", metric: "1,245", metricLabel: "Orders", icon: "ShoppingBag" },
  { id: "finance", title: "Finance", position: { x: 30, y: 40 }, status: "busy", metric: "12.5M", metricLabel: "Revenue", icon: "DollarSign" },
  { id: "inventory", title: "Inventory", position: { x: 50, y: 55 }, status: "online", metric: "892", metricLabel: "Items", icon: "Package" },
  { id: "crm", title: "CRM", position: { x: 70, y: 35 }, status: "online", metric: "247", metricLabel: "Clients", icon: "Users" },
  { id: "marketplace", title: "Marketplace", position: { x: 85, y: 60 }, status: "maintenance", metric: "18", metricLabel: "Vendors", icon: "Store" },
  { id: "hr", title: "HR", position: { x: 22, y: 28 }, status: "online", metric: "32", metricLabel: "Staff", icon: "UserCog" },
  { id: "ceo", title: "CEO", position: { x: 48, y: 18 }, status: "online", metric: "5", metricLabel: "Missions", icon: "Sparkles" },
  { id: "cto", title: "CTO", position: { x: 62, y: 22 }, status: "online", metric: "99.8%", metricLabel: "Uptime", icon: "Cpu" },
  { id: "caio", title: "CAIO", position: { x: 38, y: 14 }, status: "online", metric: "3", metricLabel: "Models", icon: "BrainCircuit" },
  { id: "cloud", title: "Cloud", position: { x: 78, y: 12 }, status: "online", metric: "98%", metricLabel: "Health", icon: "Cloud" },
  { id: "industrial", title: "Industrial", position: { x: 12, y: 80 }, status: "offline", metric: "0", metricLabel: "Active", icon: "Factory" },
];

export const INITIAL_STATE: DigitalTwinState = {
  timeOfDay: "day",
  transitionProgress: 0,
  hotspots: MOCK_HOTSPOTS,
  activeHotspot: null,
  lastUpdated: Date.now(),
  ambientBrightness: 1,
  ambientContrast: 1,
  ambientSaturation: 1,
  ambientGlow: 0.15,
  cameraX: 0,
  cameraY: 0,
  cameraScale: 1,
  parallaxBgX: 0,
  parallaxBgY: 0,
  parallaxCityX: 0,
  parallaxCityY: 0,
  parallaxGlowX: 0,
  parallaxGlowY: 0,
  parallaxBuildingX: 0,
  parallaxBuildingY: 0,
  reducedMotion: false,
  gameTime: 0,
};
