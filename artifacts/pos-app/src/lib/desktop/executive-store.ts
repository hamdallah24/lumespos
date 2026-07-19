import { useCallback, useEffect, useReducer, useRef } from "react";
import type { AIExecutive, ExecutiveAction } from "./types";

const DEFAULT_EXECUTIVES: AIExecutive[] = [
  {
    id: "ceo",
    role: "CEO",
    title: "Chief Executive Officer",
    status: "idle",
    health: 100,
    confidence: 95,
    currentMission: null,
    lastAction: "System initialized",
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#2563EB",
    icon: "Crown",
  },
  {
    id: "cto",
    role: "CTO",
    title: "Chief Technology Officer",
    status: "idle",
    health: 100,
    confidence: 92,
    currentMission: null,
    lastAction: "Architecture review complete",
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#7C3AED",
    icon: "Code",
  },
  {
    id: "coo",
    role: "COO",
    title: "Chief Operating Officer",
    status: "idle",
    health: 100,
    confidence: 88,
    currentMission: null,
    lastAction: "Operations pipeline ready",
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#059669",
    icon: "Settings",
  },
  {
    id: "cfo",
    role: "CFO",
    title: "Chief Financial Officer",
    status: "idle",
    health: 100,
    confidence: 91,
    currentMission: null,
    lastAction: "Financial models loaded",
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#D97706",
    icon: "TrendingUp",
  },
  {
    id: "cmo",
    role: "CMO",
    title: "Chief Marketing Officer",
    status: "sleeping",
    health: 100,
    confidence: 85,
    currentMission: null,
    lastAction: null,
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#DC2626",
    icon: "Megaphone",
  },
  {
    id: "chro",
    role: "CHRO",
    title: "Chief Human Resources Officer",
    status: "sleeping",
    health: 100,
    confidence: 87,
    currentMission: null,
    lastAction: null,
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#EA580C",
    icon: "Users",
  },
  {
    id: "caio",
    role: "CAIO",
    title: "Chief AI Officer",
    status: "idle",
    health: 100,
    confidence: 94,
    currentMission: null,
    lastAction: "Neural pathways calibrated",
    currentTool: null,
    runningTime: null,
    estimatedCompletion: null,
    color: "#0EA5E9",
    icon: "Brain",
  },
];

let _executives: AIExecutive[] = [...DEFAULT_EXECUTIVES];
let _listeners: (() => void)[] = [];

function reducer(state: AIExecutive[], action: ExecutiveAction): AIExecutive[] {
  switch (action.type) {
    case "UPDATE_EXECUTIVE":
      return state.map((e) =>
        e.id === action.id ? { ...e, ...action.updates } : e
      );
    case "SET_ALL_EXECUTIVES":
      return action.executives;
    default:
      return state;
  }
}

function dispatch(action: ExecutiveAction) {
  _executives = reducer(_executives, action);
  _listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}

function getState(): AIExecutive[] {
  return _executives;
}

export function useExecutiveStore() {
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);
  const stateRef = useRef(_executives);
  stateRef.current = _executives;

  useEffect(() => {
    return subscribe(() => {
      stateRef.current = getState();
      forceUpdate();
    });
  }, []);

  const updateExecutive = useCallback((id: string, updates: Partial<AIExecutive>) => {
    dispatch({ type: "UPDATE_EXECUTIVE", id, updates });
  }, []);

  const setAllExecutives = useCallback((executives: AIExecutive[]) => {
    dispatch({ type: "SET_ALL_EXECUTIVES", executives });
  }, []);

  return {
    executives: stateRef.current,
    updateExecutive,
    setAllExecutives,
  };
}
