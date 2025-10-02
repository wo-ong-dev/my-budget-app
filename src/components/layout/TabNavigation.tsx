export type TabKey = "input" | "history" | "summary";

export interface TabDefinition {
  key: TabKey;
  label: string;
  description?: string;
}

type TabNavigationProps = {
  tabs: TabDefinition[];
  activeTab: TabKey;
  onSelect: (key: TabKey) => void;
};

function TabNavigation({ tabs, activeTab, onSelect }: TabNavigationProps) {
  return (
    <nav className="tab-navigation" aria-label="주요 기능">
      {tabs.map(({ key, label, description }) => (
        <button
          key={key}
          type="button"
          className={`tab-navigation__button${activeTab === key ? " tab-navigation__button--active" : ""}`}
          onClick={() => onSelect(key)}
        >
          <span>{label}</span>
          {description ? <small>{description}</small> : null}
        </button>
      ))}
    </nav>
  );
}

export default TabNavigation;
