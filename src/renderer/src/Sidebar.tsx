import logoImg from './Logo.png';
import { IconTranslate, IconScreenSnip, IconScan, IconHistory, IconSettings, IconPrivacy } from './components/Icons';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  version: string;
  isCompact: boolean;
  privacyMode: boolean;
  onToggleCompact: () => void;
}

/**
 * Sidebar navigation — 240px expanded / 48px compact with toggle.
 * Why: The sidebar provides consistent access to primary navigation.
 * Active state uses primary/10 bg + 3px left border for clear affordance.
 * Toggle button at the bottom allows user to collapse/expand for more workspace.
 */
export default function Sidebar({ activeTab, onTabChange, version, isCompact, privacyMode, onToggleCompact }: SidebarProps) {
  const tabs = [
    { id: 'translator', icon: <IconTranslate className="w-5 h-5" />, label: 'Translate' },
    { id: 'image', icon: <IconScreenSnip className="w-5 h-5" />, label: 'OCR' },
    { id: 'import', icon: <IconScan className="w-5 h-5" />, label: 'Import' },
    { id: 'history', icon: <IconHistory className="w-5 h-5" />, label: 'History' },
  ];

  return (
    <div className={`flex flex-col h-full bg-surface-container-low border-r border-outline-variant transition-all duration-300 ease-in-out shrink-0 ${isCompact ? 'w-[56px]' : 'w-[240px]'}`}>
      {/* Logo & branding */}
      <div className={`flex items-center ${isCompact ? 'justify-center px-2 pt-4 pb-4' : 'px-4 pt-4 pb-6 gap-2'}`}>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          <img src={logoImg} alt="SnapLingo" className="w-7 h-7 object-contain" />
        </div>
        {!isCompact && (
          <div>
            <div className="text-sm font-semibold text-primary">SnapLingo</div>
            <div className="text-[12px] text-on-surface-variant">Local Processing</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            title={isCompact ? t.label : undefined}
            className={`w-full flex items-center rounded-md text-[12px] font-bold transition-all duration-200 ease-in-out
              border-l-[3px]
              ${isCompact ? 'justify-center px-0 py-2.5 gap-0' : 'gap-4 px-4 py-2'}
              ${activeTab === t.id
                ? 'bg-primary/10 text-primary border-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high border-transparent'
              }`}
          >
            {t.icon}
            {!isCompact && <span>{t.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom: Settings + Privacy + Toggle */}
      <div className="px-2 mt-auto space-y-1 pb-3">
        <button
          onClick={() => onTabChange('settings')}
          title={isCompact ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-md text-[12px] font-bold transition-all border-l-[3px]
            ${activeTab === 'settings'
              ? 'bg-primary/10 text-primary border-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high border-transparent'
            } ${isCompact ? 'justify-center px-0 py-2.5' : 'gap-4 px-4 py-2'}`}
        >
          <IconSettings className="w-5 h-5" />
          {!isCompact && <span>Settings</span>}
        </button>
        <button
          onClick={() => onTabChange('settings')}
          title={isCompact ? 'Privacy' : undefined}
          className={`w-full flex items-center rounded-md text-[12px] font-bold transition-all border-l-[3px] border-transparent
            ${privacyMode ? 'text-secondary' : 'text-on-surface-variant'} hover:bg-surface-container-high
            ${isCompact ? 'justify-center px-0 py-2.5' : 'gap-4 px-4 py-2'}`}
        >
          <IconPrivacy className="w-5 h-5" />
          {!isCompact && <span>Privacy</span>}
        </button>

        {/* ─── Toggle collapse/expand button ─── */}
        <div className="pt-2 border-t border-outline-variant/30">
          <button
            onClick={onToggleCompact}
            title={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center rounded-md text-[12px] font-bold text-on-surface-variant
              hover:bg-surface-container-high hover:text-primary transition-all border-l-[3px] border-transparent
              ${isCompact ? 'justify-center px-0 py-2.5' : 'gap-4 px-4 py-2'}`}
          >
            {/* Chevron arrow — rotates based on state */}
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${isCompact ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!isCompact && <span>Collapse</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
