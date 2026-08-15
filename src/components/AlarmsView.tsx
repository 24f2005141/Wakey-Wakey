import React, { useState } from 'react';
import { MapPin, Search, Plus, Compass, BellOff, Bell, Trash2, Edit3, Play, Volume2 } from 'lucide-react';
import { Alarm } from '../types';
import { formatDistance } from '../utils/geo';

interface AlarmsViewProps {
  alarms: Alarm[];
  onToggleAlarm: (id: string) => void;
  onSelectAlarm: (alarm: Alarm) => void;
  onOpenNewAlarm: () => void;
  onDeleteAlarm: (id: string) => void;
  onTestTriggerAlarm: (alarm: Alarm) => void;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  alarms,
  onToggleAlarm,
  onSelectAlarm,
  onOpenNewAlarm,
  onDeleteAlarm,
  onTestTriggerAlarm,
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
    <div id="alarms-screen-view" className="relative w-full h-full flex flex-col bg-[#12060c] text-white overflow-hidden">
      {/* Top Header matching Image 3 */}
      <header className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-[#280c1b]/60">
        <button
          onClick={onOpenNewAlarm}
          className="p-1 text-[#e8a3ba] hover:text-white transition-colors"
          title="Add location alarm"
        >
          <MapPin className="w-5 h-5" />
        </button>

        <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
          Wakey Wakey
        </h1>

        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-1 text-[#e8a3ba] hover:text-white transition-colors"
          title="Search alarms"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* Optional Search Bar */}
      {showSearch && (
        <div className="px-6 py-2 bg-[#1b0a13] border-b border-[#2e1022]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter alarms by name..."
            className="w-full bg-[#12060c] border border-[#3e1327] rounded-full px-4 py-2 text-sm text-[#fce4ec] font-spacemono focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24 space-y-4">
        {/* Title + Active Count + Add Button Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-fraunces text-3xl font-semibold text-white tracking-tight">
              Alarms
            </h2>
            <div className="flex items-center gap-1.5 mt-1 font-spacemono text-xs text-[#ffa8bf]">
              <span className="w-2 h-2 rounded-full bg-[#ffa8bf] inline-block animate-pulse" />
              <span>{activeCount} Active Alarms</span>
            </div>
          </div>

          {/* Plus Action Button matching Image 3 */}
          <button
            id="btn-add-alarm-top"
            onClick={onOpenNewAlarm}
            title="Create New Alarm"
            className="w-12 h-12 rounded-full bg-[#701533] hover:bg-[#881d40] active:scale-95 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(112,21,51,0.6)] border border-[#ffa8bf]/20 transition-all cursor-pointer"
          >
            <Plus className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* List of Alarms */}
        {filteredAlarms.length === 0 ? (
          <div className="py-16 text-center text-[#9e7a89] font-spacemono text-sm">
            <BellOff className="w-12 h-12 mx-auto mb-3 text-[#541a2e]" />
            <p>No alarms found.</p>
            <button
              onClick={onOpenNewAlarm}
              className="mt-4 px-5 py-2 rounded-full bg-[#701533] text-[#ffa8bf] font-fraunces text-sm"
            >
              + Create First Alarm
            </button>
          </div>
        ) : (
          filteredAlarms.map((alarm) => {
            const isInactive = !alarm.enabled;

            return (
              <div
                key={alarm.id}
                id={`alarm-card-${alarm.id}`}
                className={`group relative rounded-full p-2.5 pr-6 flex items-center gap-4 transition-all duration-200 border cursor-pointer ${
                  isInactive
                    ? 'bg-[#180911]/80 border-[#2b0f1e] opacity-70 hover:opacity-100'
                    : 'bg-[#210c18] border-[#44172c] hover:border-[#6b1e3e] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                }`}
                onClick={() => onSelectAlarm(alarm)}
              >
                {/* Left Mini-map Circular Thumbnail */}
                {renderMapThumbnail(alarm)}

                {/* Alarm Details (Title & Radius) */}
                <div className="flex-1 min-w-0 pr-2">
                  <h3
                    className={`font-fraunces text-xl truncate font-normal tracking-wide ${
                      isInactive ? 'text-[#a88a97] line-through' : 'text-white'
                    }`}
                  >
                    {alarm.name}
                  </h3>

                  <div className="flex items-center gap-1.5 mt-1 font-spacemono text-xs text-[#d69db3]">
                    {isInactive ? (
                      <>
                        <BellOff className="w-3.5 h-3.5 text-[#85576a]" />
                        <span className="text-[#85576a]">Disabled</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5 text-[#ffa8bf]" />
                        <span>Within {formatDistance(alarm.radius)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Test Alarm Trigger Button (Quick Preview!) */}
                  <button
                    onClick={() => onTestTriggerAlarm(alarm)}
                    title="Test trigger alarm screen"
                    className="p-2 rounded-full text-[#a88294] hover:text-[#ffa8bf] hover:bg-[#341123] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>

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
          })
        )}
      </div>
    </div>
  );
};
