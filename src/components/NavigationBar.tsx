import React from 'react';
import { Map, Bell, Settings } from 'lucide-react';
import { TabType } from '../types';

interface NavigationBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  activeAlarmsCount?: number;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onChangeTab,
  activeAlarmsCount = 0,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Main Navigation"
      className="relative z-30 w-full bg-[#12060c] border-t border-[#311120]/60 px-6 py-2 pb-5 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.6)]"
    >
      {/* Map Tab */}
      <button
        id="nav-tab-map"
        onClick={() => onChangeTab('map')}
        className={`flex flex-col items-center justify-center transition-all duration-200 ${
          activeTab === 'map'
            ? 'bg-[#701533] text-[#fce4ec] px-5 py-1.5 rounded-full shadow-[0_2px_12px_rgba(112,21,51,0.5)]'
            : 'text-[#a88294] hover:text-[#f8bbd0] px-3 py-1'
        }`}
      >
        <Map className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'map' ? 2.2 : 1.8} />
        <span className="font-fraunces text-xs tracking-wide">Map</span>
      </button>

      {/* Alarms Tab */}
      <button
        id="nav-tab-alarms"
        onClick={() => onChangeTab('alarms')}
        className={`relative flex flex-col items-center justify-center transition-all duration-200 ${
          activeTab === 'alarms'
            ? 'bg-[#701533] text-[#fce4ec] px-5 py-1.5 rounded-full shadow-[0_2px_12px_rgba(112,21,51,0.5)]'
            : 'text-[#a88294] hover:text-[#f8bbd0] px-3 py-1'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'alarms' ? 2.2 : 1.8} />
          {activeAlarmsCount > 0 && activeTab !== 'alarms' && (
            <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-[#ffa8bf] rounded-full ring-2 ring-[#12060c]" />
          )}
        </div>
        <span className="font-fraunces text-xs tracking-wide">Alarms</span>
      </button>

      {/* Settings Tab */}
      <button
        id="nav-tab-settings"
        onClick={() => onChangeTab('settings')}
        className={`flex flex-col items-center justify-center transition-all duration-200 ${
          activeTab === 'settings'
            ? 'bg-[#701533] text-[#fce4ec] px-5 py-1.5 rounded-full shadow-[0_2px_12px_rgba(112,21,51,0.5)]'
            : 'text-[#a88294] hover:text-[#f8bbd0] px-3 py-1'
        }`}
      >
        <Settings className="w-5 h-5 mb-0.5" strokeWidth={activeTab === 'settings' ? 2.2 : 1.8} />
        <span className="font-fraunces text-xs tracking-wide">Settings</span>
      </button>
    </nav>
  );
};
