interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  version: string;
  isCompact: boolean;
  privacyMode: boolean;
}
export default function Sidebar({ activeTab, onTabChange, version, isCompact, privacyMode }: SidebarProps) {
  const tabs = [
    { id: 'translator', icon: '文', label: 'Home' },
    { id: 'image', icon: '📷', label: 'Image OCR' },
    { id: 'history', icon: '🕐', label: 'History' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];
  return (
    <div className={`flex flex-col h-full bg-surface-container-low border-r border-outline-variant ${isCompact ? 'w-[48px]' : 'w-[200px]'}`}>
      {!isCompact && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-container rounded flex items-center justify-center text-white text-xs font-bold">文</div>
            <div>
              <div className="text-sm font-semibold text-on-surface">SnapLingo</div>
              <div className="text-[10px] text-on-surface-variant">v{version}</div>
            </div>
          </div>
        </div>
      )}
      <nav className="flex-1 mt-2 space-y-0.5 px-1.5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onTabChange(t.id)}
            className={`w-full flex items-center gap-3 rounded-fluent transition-colors relative
              ${isCompact ? 'justify-center px-2 py-2.5' : 'px-3 py-2'}
              ${activeTab === t.id ? 'bg-primary-fixed text-primary font-semibold' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            {activeTab === t.id && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary-container rounded-r" />}
            <span className="text-base">{t.icon}</span>
            {!isCompact && <span className="text-[13px]">{t.label}</span>}
          </button>
        ))}
      </nav>
      <button onClick={() => onTabChange('settings')}
        className={`flex items-center gap-2 mx-1.5 mb-3 rounded-fluent px-3 py-2 text-on-surface-variant hover:bg-surface-container-high ${isCompact ? 'justify-center' : ''}`}>
        <span className={`text-sm ${privacyMode ? 'text-teal' : ''}`}>🛡️</span>
        {!isCompact && <span className="text-[12px] font-medium">Privacy</span>}
      </button>
    </div>
  );
}
