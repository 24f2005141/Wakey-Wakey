import React from 'react';
import { Map, Bell, Settings } from 'lucide-react';
import { TabType, UserLocation } from '../types';

interface NavigationBarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  activeAlarmsCount?: number;
  onOpenNewAlarm?: () => void;
  userLocation?: UserLocation;
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
      className="relative z-30 w-full max-w-full bg-[#12060c] border-t border-[#311120]/80 px-2 sm:px-4 py-2 pb-4 sm:pb-3 flex items-center justify-center shadow-[0_-4px_24px_rgba(0,0,0,0.6)] shrink-0 overflow-hidden box-border"
    >
      <div className="w-full max-w-md sm:max-w-lg flex items-center justify-around gap-1">
        {/* Map Tab */}
        <button
          id="nav-tab-map"
          onClick={() => onChangeTab('map')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer min-h-[42px] select-none ${
            activeTab === 'map'
              ? 'bg-[#701533] text-[#fce4ec] px-4 sm:px-6 py-2 rounded-full shadow-[0_2px_14px_rgba(112,21,51,0.6)] border border-[#ffa8bf]/30'
              : 'text-[#a88294] hover:text-[#f8bbd0] px-3 sm:px-4 py-2 rounded-full hover:bg-[#200b17]'
          }`}
        >
          <Map className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={activeTab === 'map' ? 2.2 : 1.8} />
          <span className="font-fraunces text-xs sm:text-sm font-medium tracking-wide">Map</span>
        </button>

        {/* Alarms Tab */}
        <button
          id="nav-tab-alarms"
          onClick={() => onChangeTab('alarms')}
          className={`relative flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer min-h-[42px] select-none ${
            activeTab === 'alarms'
              ? 'bg-[#701533] text-[#fce4ec] px-4 sm:px-6 py-2 rounded-full shadow-[0_2px_14px_rgba(112,21,51,0.6)] border border-[#ffa8bf]/30'
              : 'text-[#a88294] hover:text-[#f8bbd0] px-3 sm:px-4 py-2 rounded-full hover:bg-[#200b17]'
          }`}
        >
          <div className="relative flex items-center">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={activeTab === 'alarms' ? 2.2 : 1.8} />
            {activeAlarmsCount > 0 && (
              <span
                className={`ml-1 font-spacemono text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'alarms'
                    ? 'bg-[#ffa8bf] text-[#541229]'
                    : 'bg-[#ffa8bf]/80 text-[#541229]'
                }`}
              >
                {activeAlarmsCount}
              </span>
            )}
          </div>
          <span className="font-fraunces text-xs sm:text-sm font-medium tracking-wide">Alarms</span>
        </button>

        {/* Settings Tab */}
        <button
          id="nav-tab-settings"
          onClick={() => onChangeTab('settings')}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer min-h-[42px] select-none ${
            activeTab === 'settings'
              ? 'bg-[#701533] text-[#fce4ec] px-4 sm:px-6 py-2 rounded-full shadow-[0_2px_14px_rgba(112,21,51,0.6)] border border-[#ffa8bf]/30'
              : 'text-[#a88294] hover:text-[#f8bbd0] px-3 sm:px-4 py-2 rounded-full hover:bg-[#200b17]'
          }`}
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={activeTab === 'settings' ? 2.2 : 1.8} />
          <span className="font-fraunces text-xs sm:text-sm font-medium tracking-wide">Settings</span>
        </button>
      </div>
    </nav>
  );
};
