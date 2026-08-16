import React, { useState } from 'react';
import { Play, Compass, Zap, CheckCircle2, Check, Volume2 } from 'lucide-react';
import { playAlarmSequence } from '../utils/audio';

interface SettingsViewProps {
  onTriggerTestAlarm: () => void;
  defaultTone: string;
  onSelectDefaultTone: (toneId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onTriggerTestAlarm,
  defaultTone,
  onSelectDefaultTone,
}) => {
  const [playingToneId, setPlayingToneId] = useState<string | null>(null);

  const tones = [
    { id: 'gentle_chime', name: 'Gentle Wake Arpeggio', desc: 'Soft rising chime chord (C-E-G-C)' },
    { id: 'station_bell', name: 'Transit Station Bell', desc: 'Classic two-tone transit bell' },
    { id: 'subway_alert', name: 'Subway Arrival Chime', desc: 'Harmonic 3-tone metro alert' },
    { id: 'urgency_pulse', name: 'Urgent Transit Pulse', desc: 'Sharp rhythmic warning alert' },
  ];

  const handleSelectTone = (toneId: string) => {
    onSelectDefaultTone(toneId);
    setPlayingToneId(toneId);
    playAlarmSequence(toneId, 0.45);
    setTimeout(() => {
      setPlayingToneId(null);
    }, 1200);
  };

  return (
    <div
      id="settings-screen-view"
      className="relative w-full h-full flex flex-col bg-[#12060c] text-white overflow-y-auto overflow-x-hidden pb-8 max-w-full"
    >
      {/* Top Brand Header */}
      <header className="px-5 sm:px-6 pt-4 pb-3 border-b border-[#280c1b]/60 shrink-0">
        <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
          Wakey Wakey
        </h1>
      </header>

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-5 space-y-5">
        <div>
          <h2 className="font-fraunces text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Settings
          </h2>
          <p className="font-spacemono text-xs text-[#b88c9f] mt-0.5">
            Default alarm tone and system diagnostics.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5">
          {/* System Status */}
          <section className="space-y-2">
            <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              SYSTEM STATUS
            </label>
            <div className="bg-[#1a0a13] border border-[#3e1327] rounded-2xl p-4 flex items-center justify-between shadow-sm min-h-[80px]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#152e18] border border-[#2e6d33]/50 flex items-center justify-center text-[#4caf50] shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-fraunces text-base text-white truncate">Geofencing & GPS</div>
                  <div className="flex items-center gap-1.5 font-spacemono text-xs text-[#4caf50] mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#4caf50] inline-block animate-pulse shrink-0" />
                    <span className="truncate">Active & Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Alarm Sounds Section with Persistent Default Selection */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              DEFAULT ALARM TONE
            </label>
            <span className="font-spacemono text-[10px] text-[#ffa8bf] flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              Tap to preview & select
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tones.map((tone) => {
              const isSelected = defaultTone === tone.id;
              const isPlaying = playingToneId === tone.id;

              return (
                <div
                  key={tone.id}
                  id={`tone-option-${tone.id}`}
                  onClick={() => handleSelectTone(tone.id)}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 max-w-full ${
                    isSelected
                      ? 'bg-[#2f1022] border-[#ffa8bf] shadow-[0_0_18px_rgba(255,168,191,0.22)]'
                      : 'bg-[#180911] border-[#311120] hover:border-[#4a182f] hover:bg-[#200b17]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#ffa8bf] text-[#541229]'
                          : 'bg-[#2a0e1e] text-[#6d4354] border border-[#3e1327]'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-fraunces text-sm sm:text-base text-white truncate">
                          {tone.name}
                        </span>
                        {isSelected && (
                          <span className="font-spacemono text-[9px] bg-[#ffa8bf]/20 text-[#ffa8bf] px-1.5 py-0.2 rounded-full border border-[#ffa8bf]/40">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="font-spacemono text-[11px] text-[#a88294] mt-0.5 truncate">
                        {tone.desc}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTone(tone.id);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      isPlaying
                        ? 'bg-[#ffa8bf] text-[#541229] scale-105 shadow-md'
                        : isSelected
                        ? 'bg-[#521735] text-[#ffa8bf] hover:bg-[#681e44]'
                        : 'bg-[#311120] text-[#c48d9f] hover:bg-[#46172e] hover:text-white'
                    }`}
                    title="Play sound sample"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ml-0.5 ${isPlaying ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Instant Preview Fullscreen Alarm */}
          <section className="space-y-2">
            <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
              PREVIEW FULLSCREEN ALARM
            </label>
            <button
              onClick={onTriggerTestAlarm}
              className="w-full bg-[#701533] hover:bg-[#881d40] text-[#fce4ec] font-fraunces text-base py-3 px-6 rounded-2xl flex items-center justify-center gap-2 border border-[#ffa8bf]/30 shadow-lg transition-all cursor-pointer"
            >
              <Zap className="w-5 h-5 text-[#ffa8bf]" />
              <span>Test Fullscreen Alarm</span>
            </button>
          </section>

          {/* About App */}
          <section className="bg-[#160810] border border-[#2e0e1e] rounded-2xl p-4 flex flex-col justify-center text-center space-y-1">
            <h3 className="font-fraunces text-base sm:text-lg text-[#ffa8bf]">Wakey Wakey</h3>
            <p className="font-spacemono text-[11px] sm:text-xs text-[#8f6d7d]">
              GPS Proximity Alarm with instant audio synthesis.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
