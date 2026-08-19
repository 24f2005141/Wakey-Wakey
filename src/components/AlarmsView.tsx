import React, { useState } from 'react';
import { MapPin, Search, Plus, Compass, BellOff, Bell, Trash2, Edit3, Volume2 } from 'lucide-react';
import { Alarm } from '../types';
import { formatDistance } from '../utils/geo';

interface AlarmsViewProps {
  alarms: Alarm[];
  onToggleAlarm: (id: string) => void;
  onSelectAlarm: (alarm: Alarm) => void;
  onOpenNewAlarm: () => void;
  onDeleteAlarm: (id: string) => void;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  alarms,
  onToggleAlarm,
  onSelectAlarm,
  onOpenNewAlarm,
  onDeleteAlarm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const activeCount = alarms.filter((a) => a.enabled).length;

  const filteredAlarms = alarms.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to render stylized SVG mini-map thumbnail matching screenshot 2
  const renderMapThumbnail = (alarm: Alarm) => {
    const isInactive = !alarm.enabled;
    return (
      <div
        className={`relative w-18 h-18 rounded-full overflow-hidden shrink-0 border-2 transition-all ${
          isInactive
            ? 'border-[#3f1929] grayscale opacity-60'
            : 'border-[#701533] shadow-[0_0_12px_rgba(255,168,191,0.2)]'
        }`}
      >
        {/* Stylized vector map streets backdrop */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full bg-[#d6e2e6]"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Waterway */}
          <path d="M-10,40 Q30,60 60,30 T110,50 L110,110 L-10,110 Z" fill="#bfe0ed" />
          {/* Street grid lines */}
          <line x1="0" y1="20" x2="100" y2="80" stroke="#ffffff" strokeWidth="6" />
          <line x1="0" y1="50" x2="100" y2="20" stroke="#ffffff" strokeWidth="5" />
          <line x1="20" y1="0" x2="80" y2="100" stroke="#ffffff" strokeWidth="5" />
          <line x1="60" y1="0" x2="30" y2="100" stroke="#ffffff" strokeWidth="4" />
          <line x1="10" y1="85" x2="90" y2="15" stroke="#fce4ec" strokeWidth="3" />
          <line x1="45" y1="0" x2="55" y2="100" stroke="#ffffff" strokeWidth="4" />

          {/* Destination Pin */}
          <circle cx="50" cy="50" r="14" fill="rgba(255, 168, 191, 0.4)" />
          <circle cx="50" cy="50" r="6" fill="#701533" />
          <circle cx="50" cy="50" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    );
  };

  return (
    <div id="alarms-screen-view" className="relative w-full h-full flex flex-col bg-[#12060c] text-white overflow-y-auto overflow-x-hidden pb-8 max-w-full">
      {/* Top Brand Header */}
      <header className="px-5 sm:px-6 pt-4 pb-3 flex items-center justify-between border-b border-[#280c1b]/60 shrink-0">
        <button
          onClick={onOpenNewAlarm}
          className="p-1.5 text-[#e8a3ba] hover:text-white transition-colors rounded-full hover:bg-[#250d1a]"
          title="Add location alarm"
        >
          <MapPin className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img
            src="/icon.svg"
            alt="Wakey Wakey Logo"
            className="w-7 h-7 rounded-lg shadow-sm border border-[#ffa8bf]/30"
          />
          <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
            Wakey Wakey
          </h1>
        </div>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-1.5 text-[#e8a3ba] hover:text-white transition-colors rounded-full hover:bg-[#250d1a]"
          title="Search alarms"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area with Centered Responsive Max Width */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        {/* Title + Active Count + Add Button Row */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-fraunces text-3xl font-semibold text-white tracking-tight">
              My Alarms
            </h2>
            <div className="flex items-center gap-1.5 mt-1 font-spacemono text-xs text-[#ffa8bf]">
              <span className="w-2 h-2 rounded-full bg-[#ffa8bf] inline-block animate-pulse" />
              <span>{activeCount} Active Alarms</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop & Tablet Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alarms..."
                className="w-48 sm:w-64 bg-[#1b0a13] border border-[#3e1327] rounded-full pl-9 pr-4 py-2 text-xs font-spacemono text-[#fce4ec] placeholder-[#7d596a] focus:outline-none focus:border-[#ffa8bf] transition-colors"
              />
              <Search className="w-4 h-4 text-[#8f687a] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Plus Action Button */}
            <button
              id="btn-add-alarm-top"
              onClick={onOpenNewAlarm}
              title="Create New Alarm"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#701533] hover:bg-[#881d40] active:scale-95 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(112,21,51,0.6)] border border-[#ffa8bf]/20 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Optional Search Bar on Mobile */}
        {showSearch && (
          <div className="md:hidden py-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter alarms by name..."
              className="w-full bg-[#12060c] border border-[#3e1327] rounded-full px-4 py-2 text-xs text-[#fce4ec] font-spacemono focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {/* Responsive Grid of Alarms */}
        {filteredAlarms.length === 0 ? (
          <div className="py-20 text-center text-[#9e7a89] font-spacemono text-sm bg-[#160810] border border-[#2e0e1e] rounded-3xl p-8">
            <BellOff className="w-12 h-12 mx-auto mb-3 text-[#541a2e]" />
            <p>No alarms found.</p>
            <button
              onClick={onOpenNewAlarm}
              className="mt-4 px-6 py-2.5 rounded-full bg-[#701533] hover:bg-[#881d40] text-[#ffa8bf] font-fraunces text-sm transition-colors cursor-pointer"
            >
              + Create First Alarm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlarms.map((alarm) => {
              const isInactive = !alarm.enabled;

              return (
                <div
                  key={alarm.id}
                  id={`alarm-card-${alarm.id}`}
                  className={`group relative rounded-3xl p-4 flex items-center gap-4 transition-all duration-200 border cursor-pointer ${
                    isInactive
                      ? 'bg-[#180911]/80 border-[#2b0f1e] opacity-70 hover:opacity-100'
                      : 'bg-[#1e0b16] border-[#44172c] hover:border-[#ffa8bf]/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                  }`}
                  onClick={() => onSelectAlarm(alarm)}
                >
                  {/* Left Mini-map Circular Thumbnail */}
                  {renderMapThumbnail(alarm)}

                  {/* Alarm Details (Title & Radius) */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3
                      className={`font-fraunces text-lg truncate font-normal tracking-wide ${
                        isInactive ? 'text-[#a88a97] line-through' : 'text-white'
                      }`}
                    >
                      {alarm.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1 font-spacemono text-xs text-[#d69db3]">
                      {isInactive ? (
                        <>
                          <BellOff className="w-3.5 h-3.5 text-[#85576a]" />
                          <span className="text-[#85576a]">Disabled</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3.5 h-3.5 text-[#ffa8bf]" />
                          <span>Within {formatDistance(alarm.radius)}</span>
                          {alarm.sound && alarm.alarmTone && (
                            <span className="text-[10px] bg-[#311120] text-[#ffa8bf] px-1.5 py-0.2 rounded border border-[#521b34]">
                              {alarm.alarmTone === 'station_bell'
                                ? 'Station Bell'
                                : alarm.alarmTone === 'subway_alert'
                                ? 'Subway Chime'
                                : alarm.alarmTone === 'urgency_pulse'
                                ? 'Urgent Pulse'
                                : 'Gentle Wake'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Quick Controls */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Switch */}
                    <button
                      onClick={() => onToggleAlarm(alarm.id)}
                      aria-label={`Toggle alarm for ${alarm.name}`}
                      className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                        alarm.enabled ? 'bg-[#ffa8bf]' : 'bg-[#311120]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          alarm.enabled
                            ? 'translate-x-5 bg-[#541229]'
                            : 'translate-x-0 bg-[#7a4e62]'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
