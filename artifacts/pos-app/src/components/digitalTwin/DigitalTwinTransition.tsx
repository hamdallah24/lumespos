// Sprint 1 — Day/Night transition with cinematic effects
import React, { useRef, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { useDigitalTwin } from "./DigitalTwinProvider";
import cityDay from "@/assets/digital-twin/city-day.webp";
import cityNight from "@/assets/digital-twin/city-night.webp";

export default function DigitalTwinTransition() {
  const { state, dispatch } = useDigitalTwin();
  const dayControls = useAnimation();
  const nightControls = useAnimation();
  const transitioning = useRef(false);

  useEffect(() => {
    if (transitioning.current) return;
    transitioning.current = true;

    const isDay = state.timeOfDay === "day";
    const duration = state.reducedMotion ? 0.5 : 2.5;

    // Animate brightness/contrast/saturation through dispatch
    const startTime = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      dispatch({ type: "SET_TRANSITION_PROGRESS", payload: eased });

      if (isDay) {
        dispatch({
          type: "UPDATE_METRICS",
          payload: {
            ambientBrightness: 0.4 + eased * 0.6,
            ambientContrast: 0.6 + eased * 0.4,
            ambientSaturation: 0.3 + eased * 0.7,
            ambientGlow: eased * 0.15,
          },
        });
      } else {
        dispatch({
          type: "UPDATE_METRICS",
          payload: {
            ambientBrightness: 1 - eased * 0.6,
            ambientContrast: 1 - eased * 0.4,
            ambientSaturation: 1 - eased * 0.7,
            ambientGlow: 0.15 - eased * 0.15,
          },
        });
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        transitioning.current = false;
      }
    };

    if (isDay) {
      nightControls.start({ opacity: 0 });
      dayControls.start({ opacity: 1 });
    } else {
      dayControls.start({ opacity: 0 });
      nightControls.start({ opacity: 1 });
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeOfDay, state.reducedMotion]);

  return (
    <>
      {/* Day layer */}
      <motion.div
        animate={dayControls}
        initial={{ opacity: 1 }}
        transition={{ duration: 0 }}
        className="absolute inset-0"
        style={{
          filter: `brightness(${state.ambientBrightness}) contrast(${state.ambientContrast}) saturate(${state.ambientSaturation})`,
        }}
      >
        <img
          src={cityDay}
          alt="City Day"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </motion.div>

      {/* Night layer */}
      <motion.div
        animate={nightControls}
        initial={{ opacity: 0 }}
        transition={{ duration: 0 }}
        className="absolute inset-0"
        style={{
          filter: `brightness(${1 - state.ambientBrightness + 0.4}) contrast(${1 - state.ambientContrast + 0.6}) saturate(${1 - state.ambientSaturation + 0.3})`,
        }}
      >
        <img
          src={cityNight}
          alt="City Night"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </motion.div>

      {/* Ambient glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(14,165,233,${state.ambientGlow}), transparent 70%)`,
          opacity: state.ambientGlow > 0.01 ? 1 : 0,
        }}
      />

      {/* Dynamic light tint — warm day, cool night */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: state.timeOfDay === "day"
            ? Math.min(state.ambientGlow * 6, 0.08)
            : Math.min((0.15 - state.ambientGlow) * 1.5, 0.1),
          transition: "opacity 2.5s ease-in-out",
          background: state.timeOfDay === "day"
            ? "linear-gradient(180deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 50%, transparent 100%)"
            : "linear-gradient(180deg, rgba(30,58,138,0.12) 0%, rgba(30,58,138,0.04) 50%, transparent 100%)",
        }}
      />
    </>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
