import { useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useDigitalTwin } from "./DigitalTwinProvider";
import type { TimeOfDay } from "./types";
import cityDay from "@/assets/digital-twin/city-day.mp4";
import citySunrise from "@/assets/digital-twin/city-sunrise.mp4";
import cityNight from "@/assets/digital-twin/city-night.mp4";

const VIDEO_MAP: Record<TimeOfDay, string> = {
  day: cityDay,
  sunrise: citySunrise,
  night: cityNight,
};

const SLOTS: TimeOfDay[] = ["day", "sunrise", "night"];

export default function DigitalTwinTransition() {
  const { state, dispatch } = useDigitalTwin();
  const dayControls = useAnimation();
  const sunriseControls = useAnimation();
  const nightControls = useAnimation();
  const dayRef = useRef<HTMLVideoElement>(null);
  const sunriseRef = useRef<HTMLVideoElement>(null);
  const nightRef = useRef<HTMLVideoElement>(null);
  const transitioning = useRef(false);
  const prevTime = useRef<TimeOfDay>(state.timeOfDay);

  const videoRefs: Record<TimeOfDay, React.RefObject<HTMLVideoElement>> = {
    day: dayRef,
    sunrise: sunriseRef,
    night: nightRef,
  };

  useEffect(() => {
    if (transitioning.current) return;
    if (state.timeOfDay === prevTime.current) return;
    prevTime.current = state.timeOfDay;

    transitioning.current = true;
    const duration = state.reducedMotion ? 0 : 2;

    videoRefs[state.timeOfDay].current?.play().catch(() => {});

    dayControls.start({ opacity: state.timeOfDay === "day" ? 1 : 0, transition: { duration, ease: "easeInOut" } });
    sunriseControls.start({ opacity: state.timeOfDay === "sunrise" ? 1 : 0, transition: { duration, ease: "easeInOut" } });
    nightControls.start({ opacity: state.timeOfDay === "night" ? 1 : 0, transition: { duration, ease: "easeInOut" } });

    const startTime = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      const isDay = state.timeOfDay === "day";
      const isSunrise = state.timeOfDay === "sunrise";

      dispatch({
        type: "UPDATE_METRICS",
        payload: {
          ambientGlow: isDay ? eased * 0.15 : isSunrise ? 0.12 : 0.15 - eased * 0.15,
        },
      });

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        transitioning.current = false;
      }
    };
    requestAnimationFrame(tick);
  }, [state.timeOfDay, state.reducedMotion]);

  useEffect(() => {
    const handleVisibility = () => {
      Object.values(videoRefs).forEach((ref) => {
        if (!ref.current) return;
        if (document.hidden) ref.current.pause();
        else ref.current.play().catch(() => {});
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    <>
      {SLOTS.map((slot) => {
        const controls =
          slot === "day" ? dayControls : slot === "sunrise" ? sunriseControls : nightControls;
        return (
          <motion.div
            key={slot}
            animate={controls}
            initial={{ opacity: state.timeOfDay === slot ? 1 : 0 }}
            transition={{ duration: 0 }}
            className="absolute inset-0"
            style={{ pointerEvents: "none" }}
          >
            <video
              ref={videoRefs[slot]}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              src={VIDEO_MAP[slot]}
              className="w-full h-full"
              draggable={false}
              style={{ objectFit: "cover", pointerEvents: "none" }}
            />
          </motion.div>
        );
      })}

      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(14,165,233,${state.ambientGlow}), transparent 70%)`,
          opacity: state.ambientGlow > 0.01 ? 1 : 0,
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity:
            state.timeOfDay === "day"
              ? Math.min(state.ambientGlow * 6, 0.08)
              : state.timeOfDay === "sunrise"
                ? 0.12
                : Math.min((0.15 - state.ambientGlow) * 1.5, 0.1),
          transition: "opacity 2s ease-in-out",
          background:
            state.timeOfDay === "day"
              ? "linear-gradient(180deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 50%, transparent 100%)"
              : state.timeOfDay === "sunrise"
                ? "linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(251,146,60,0.05) 50%, transparent 100%)"
                : "linear-gradient(180deg, rgba(30,58,138,0.12) 0%, rgba(30,58,138,0.04) 50%, transparent 100%)",
        }}
      />
    </>
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
