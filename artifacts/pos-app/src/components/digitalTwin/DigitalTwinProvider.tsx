// Sprint 1 — Digital Twin Provider
// Mock JSON — later replaced by realtime websocket data
import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import type { DigitalTwinState, DigitalTwinAction, DigitalTwinContextValue, TimeOfDay } from "./types";
import { INITIAL_STATE } from "./types";

function reducer(state: DigitalTwinState, action: DigitalTwinAction): DigitalTwinState {
  switch (action.type) {
    case "SET_TIME_OF_DAY":
      return { ...state, timeOfDay: action.payload };
    case "SET_TRANSITION_PROGRESS":
      return { ...state, transitionProgress: action.payload };
    case "SELECT_HOTSPOT":
      return { ...state, activeHotspot: action.payload };
    case "UPDATE_METRICS":
      return { ...state, ...action.payload };
    case "CAMERA_TICK":
      return { ...state, cameraX: action.payload.x, cameraY: action.payload.y, cameraScale: action.payload.scale };
    case "PARALLAX_TICK":
      return {
        ...state,
        parallaxBgX: action.payload.bgX,
        parallaxBgY: action.payload.bgY,
        parallaxCityX: action.payload.cityX,
        parallaxCityY: action.payload.cityY,
        parallaxGlowX: action.payload.glowX,
        parallaxGlowY: action.payload.glowY,
      };
    case "SET_REDUCED_MOTION":
      return { ...state, reducedMotion: action.payload };
    default:
      return state;
  }
}

const DigitalTwinContext = createContext<DigitalTwinContextValue | null>(null);

export function useDigitalTwin(): DigitalTwinContextValue {
  const ctx = useContext(DigitalTwinContext);
  if (!ctx) throw new Error("useDigitalTwin must be used within DigitalTwinProvider");
  return ctx;
}

export default function DigitalTwinProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const animFrame = useRef<number>(0);
  const lastTime = useRef<number>(Date.now());

  const toggleTimeOfDay = useCallback(() => {
    const next: TimeOfDay = state.timeOfDay === "day" ? "night" : "day";
    dispatch({ type: "SET_TIME_OF_DAY", payload: next });
  }, [state.timeOfDay]);

  const selectHotspot = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_HOTSPOT", payload: id });
  }, []);

  // Camera motion — very slow continuous drift
  useEffect(() => {
    if (state.reducedMotion) return;
    let elapsed = 0;
    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      elapsed += dt;
      const phase = elapsed * 0.15;
      dispatch({
        type: "CAMERA_TICK",
        payload: {
          x: Math.sin(phase * 1.3) * 3,
          y: Math.cos(phase * 0.9) * 2,
          scale: 1 + Math.sin(phase * 0.6) * 0.015,
        },
      });
      dispatch({
        type: "PARALLAX_TICK",
        payload: {
          bgX: Math.sin(phase * 0.4) * 2,
          bgY: Math.cos(phase * 0.5) * 1.5,
          cityX: Math.sin(phase * 0.7) * 4,
          cityY: Math.cos(phase * 0.6) * 3,
          glowX: Math.sin(phase * 1.1) * 1,
          glowY: Math.cos(phase * 0.8) * 0.8,
        },
      });
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reducedMotion]);

  // Pause animation when page hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animFrame.current);
      } else if (!state.reducedMotion) {
        lastTime.current = Date.now();
        animFrame.current = requestAnimationFrame(() => {});
        // restart via the effect above by toggling reducedMotion
        dispatch({ type: "SET_REDUCED_MOTION", payload: false });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [state.reducedMotion]);

  // Reduced motion media query
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => dispatch({ type: "SET_REDUCED_MOTION", payload: e.matches });
    dispatch({ type: "SET_REDUCED_MOTION", payload: mq.matches });
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Update "last updated" timestamp every 30s
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: "UPDATE_METRICS", payload: { lastUpdated: Date.now() } });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const value: DigitalTwinContextValue = { state, dispatch, toggleTimeOfDay, selectHotspot };

  return (
    <DigitalTwinContext.Provider value={value}>
      {children}
    </DigitalTwinContext.Provider>
  );
}
