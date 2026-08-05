import NavigationGroup from "./NavigationGroup";
import type {
  NavigationGroupDefinition,
  NavigationItemDefinition,
  NavigationSectionDefinition,
} from "./types";

interface NavigationSectionProps {
  section: NavigationSectionDefinition;
  collapsedGroupIds: Record<string, boolean>;
  hasActiveChild: (groupItems: NavigationItemDefinition[]) => boolean;
  onToggleGroup: (id: string) => void;
  favorites: Record<string, boolean>;
  onFavoriteToggle: (id: string) => void;
  onNavigate: (item: NavigationItemDefinition) => void;
  isActive: (item: NavigationItemDefinition) => boolean;
  forceExpanded?: boolean;
}

export default function NavigationSection({
  section,
  collapsedGroupIds,
  hasActiveChild,
  onToggleGroup,
  favorites,
  onFavoriteToggle,
  onNavigate,
  isActive,
  forceExpanded,
}: NavigationSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
        {section.label}
      </p>
      {section.groups.map((group: NavigationGroupDefinition) => (
        <NavigationGroup
          key={group.id}
          group={group}
          collapsed={!!collapsedGroupIds[group.id]}
          hasActiveChild={hasActiveChild(group.items)}
          onToggle={onToggleGroup}
          favorites={favorites}
          onFavoriteToggle={onFavoriteToggle}
          onNavigate={onNavigate}
          isActive={isActive}
          forceExpanded={forceExpanded}
        />
      ))}
    </div>
  );
}