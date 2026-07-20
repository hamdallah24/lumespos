// Sprint 1A — Living Digital Twin Provider
// Auto day/night, 30s camera drift, performance-tuned
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

function getAutoTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export default function DigitalTwinProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    timeOfDay: getAutoTimeOfDay(),
  });
  const animFrame = useRef<number>(0);
  const startTime = useRef<number>(Date.now());
  const wasHidden = useRef(false);

  const toggleTimeOfDay = useCallback(() => {
    const next: TimeOfDay = state.timeOfDay === "day" ? "night" : "day";
    dispatch({ type: "SET_TIME_OF_DAY", payload: next });
  }, [state.timeOfDay]);

  const selectHotspot = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_HOTSPOT", payload: id });
  }, []);

  // Auto day/night — check every 60 seconds
  useEffect(() => {
    const tick = () => {
      const auto = getAutoTimeOfDay();
      if (auto !== state.timeOfDay) {
        dispatch({ type: "SET_TIME_OF_DAY", payload: auto });
      }
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeOfDay]);

  // Camera drift — 30s cycle, scale 1.00→1.015, offset ±8px / ±5px
  useEffect(() => {
    if (state.reducedMotion) return;
    const tick = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const phase = (elapsed % 30) / 30 * Math.PI * 2; // full cycle every 30s
      dispatch({
        type: "CAMERA_TICK",
        payload: {
          x: Math.sin(phase * 1.7) * 8,
          y: Math.cos(phase * 1.3) * 5,
          scale: 1 + Math.sin(phase) * 0.0075,
        },
      });
      dispatch({
        type: "PARALLAX_TICK",
        payload: {
          bgX: Math.sin(phase * 0.6) * 3,
          bgY: Math.cos(phase * 0.5) * 2,
          cityX: Math.sin(phase * 1.1) * 5,
          cityY: Math.cos(phase * 0.9) * 3.5,
          glowX: Math.sin(phase * 0.4) * 1.5,
          glowY: Math.cos(phase * 0.35) * 1,
        },
      });
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.reducedMotion]);

  // Pause when hidden, resume smoothly
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        wasHidden.current = true;
        cancelAnimationFrame(animFrame.current);
      } else if (wasHidden.current && !state.reducedMotion) {
        wasHidden.current = false;
        startTime.current = Date.now();
        animFrame.current = requestAnimationFrame(() => {});
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
