// ConfigFieldFactory — metadata-driven field renderer (SettingsShell).
// Renders a form control purely from ConfigFieldMeta produced by the Registry.
// NO hardcoded fields, NO config keys in this component. Supported types:
// string, number, boolean, enum (allowedValues), secret, json (object).

import type { ConfigFieldMeta, ConfigValue } from "../api";

export interface ConfigFieldFactoryProps {
  field: ConfigFieldMeta;
  value: ConfigValue;
  onChange: (value: ConfigValue) => void;
  disabled?: boolean;
}

export default function ConfigFieldFactory({ field, value, onChange, disabled }: ConfigFieldFactoryProps) {
  const shared = "w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed";

  // enum — allowedValues takes priority over string/number base type.
  if (field.allowedValues && field.allowedValues.length > 0) {
    return (
      <select
        value={String(value ?? "")}
        disabled={disabled || field.immutable}
        onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        className={shared}
      >
        {field.allowedValues.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    );
  }

  switch (field.type) {
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled || field.immutable}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-muted-foreground">{value ? "Enabled" : "Disabled"}</span>
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          value={value == null ? "" : String(value)}
          disabled={disabled || field.immutable}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          className={shared}
        />
      );
    case "secret":
      return (
        <input
          type="password"
          placeholder="••••••••"
          value={value == null || value === "••••••••" ? "" : String(value)}
          disabled={disabled || field.immutable}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
        />
      );
    case "object":
      return (
        <textarea
          value={value == null ? "" : JSON.stringify(value, null, 2)}
          disabled={disabled || field.immutable}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              /* keep raw string while invalid */
            }
          }}
          rows={4}
          className={`${shared} font-mono text-xs`}
        />
      );
    default: // string
      return (
        <input
          type="text"
          value={value == null ? "" : String(value)}
          disabled={disabled || field.immutable}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
        />
      );
  }
}