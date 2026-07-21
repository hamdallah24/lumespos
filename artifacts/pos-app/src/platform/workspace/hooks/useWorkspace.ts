import { useContext } from "react";
import { WorkspaceContext, type WorkspaceContextValue } from "../WorkspaceContext";

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
