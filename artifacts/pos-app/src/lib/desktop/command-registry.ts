import type { CommandItem } from "./types";

let _commands: CommandItem[] = [];
let _listeners: (() => void)[] = [];

export function registerCommand(command: CommandItem) {
  _commands = [..._commands.filter((c) => c.id !== command.id), command];
  _listeners.forEach((l) => l());
}

export function registerCommands(commands: CommandItem[]) {
  _commands = [..._commands.filter((c) => !commands.some((nc) => nc.id === c.id)), ...commands];
  _listeners.forEach((l) => l());
}

export function unregisterCommand(id: string) {
  _commands = _commands.filter((c) => c.id !== id);
  _listeners.forEach((l) => l());
}

export function getCommands(): CommandItem[] {
  return _commands;
}

export function searchCommands(query: string): CommandItem[] {
  if (!query.trim()) return _commands;
  const lower = query.toLowerCase();
  return _commands
    .filter((cmd) => {
      const searchable = [
        cmd.label,
        cmd.description || "",
        ...cmd.keywords,
        cmd.category,
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(lower);
    })
    .sort((a, b) => {
      const aStart = a.label.toLowerCase().startsWith(lower) ? 0 : 1;
      const bStart = b.label.toLowerCase().startsWith(lower) ? 0 : 1;
      return aStart - bStart;
    });
}

export function subscribeCommands(listener: () => void) {
  _listeners.push(listener);
  return () => { _listeners = _listeners.filter((l) => l !== listener); };
}
