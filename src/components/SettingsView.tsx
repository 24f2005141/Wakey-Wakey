import React, { useState } from 'react';
import { Play, Compass, Zap, CheckCircle2 } from 'lucide-react';
import { playAlarmSequence } from '../utils/audio';

interface SettingsViewProps {
  isSimulated: boolean;
  onToggleSimulation: () => void;
  onTriggerTestAlarm: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isSimulated,
  onToggleSimulation,
  onTriggerTestAlarm,
}) => {
  const [selectedTone, setSelectedTone] = useState<string>('gentle_chime');
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const tones = [
    { id: 'gentle_chime', name: 'Gentle Wake Arpeggio', desc: 'Soft rising chime chord' },
    { id: 'station_bell', name: 'Transit Station Bell', desc: 'Classic two-tone train bell' },
    { id: 'urgency_pulse', name: 'Urgent Transit Pulse', desc: 'Sharp rhythmic alert' },
  ];

  const handleTestSound = (toneId: string) => {
    setSelectedTone(toneId);
    setIsPlayingTest(true);
    playAlarmSequence(toneId, 0.4);
    setTimeout(() => setIsPlayingTest(false), 1200);
  };

  return (
    <div id="settings-screen-view" className="relative w-full h-full flex flex-col bg-[#12060c] text-white overflow-y-auto pb-24">
      {/* Header */}
      <header className="px-6 pt-5 pb-3 border-b border-[#280c1b]/60">
        <h1 className="font-fraunces text-2xl text-[#ffa8bf] tracking-wide font-normal">
          Wakey Wakey
        </h1>
      </header>

      <div className="px-6 pt-5 space-y-6">
        <div>
          <h2 className="font-fraunces text-3xl font-semibold text-white tracking-tight">
            Settings
          </h2>
          <p className="font-spacemono text-xs text-[#b88c9f] mt-0.5">
            System status, alarm tones & commute simulator.
          </p>
        </div>

        {/* Single Status Section */}
        <section className="space-y-3">
          <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
            SYSTEM STATUS
          </label>
          <div className="bg-[#1a0a13] border border-[#3e1327] rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#152e18] border border-[#2e6d33]/50 flex items-center justify-center text-[#4caf50]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-fraunces text-base text-white">Status</div>
                <div className="flex items-center gap-1.5 font-spacemono text-xs text-[#4caf50] mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#4caf50] inline-block animate-pulse" />
                  <span>Working Good</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alarm Sounds Section */}
        <section className="space-y-3">
          <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
            DEFAULT ALARM TONE
          </label>
          <div className="space-y-2">
            {tones.map((tone) => (
              <div
                key={tone.id}
                onClick={() => handleTestSound(tone.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedTone === tone.id
                    ? 'bg-[#230d1b] border-[#ffa8bf]/50 shadow-[0_0_15px_rgba(255,168,191,0.15)]'
                    : 'bg-[#180911] border-[#311120] hover:border-[#4a182f]'
                }`}
              >
                <div>
                  <div className="font-fraunces text-base text-white">{tone.name}</div>
                  <div className="font-spacemono text-xs text-[#a88294] mt-0.5">{tone.desc}</div>
                </div>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-[#361224] text-[#ffa8bf] flex items-center justify-center hover:bg-[#521735] transition-colors"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* GPS Simulation / Commute Testing Mode */}
        <section className="space-y-3">
          <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
            GPS & COMMUTE SIMULATOR
          </label>
          <div className="bg-[#1a0a13] border border-[#3e1327] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#341121] flex items-center justify-center text-[#ffa8bf]">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-fraunces text-base text-white">Transit Motion Simulator</div>
                  <div className="font-spacemono text-[11px] text-[#9e7a89]">
                    Simulate traveling on train towards destination
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSimulation}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  isSimulated ? 'bg-[#ffa8bf]' : 'bg-[#2b0f1e]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
                    isSimulated ? 'translate-x-5 bg-[#541229]' : 'translate-x-0 bg-[#6d4354]'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Instant Preview Fullscreen Alarm */}
        <section className="space-y-3">
          <label className="block font-spacemono text-[11px] uppercase tracking-wider text-[#d69db3]">
            PREVIEW TEST
          </label>
          <button
            onClick={onTriggerTestAlarm}
            className="w-full bg-[#701533] hover:bg-[#881d40] text-[#fce4ec] font-fraunces text-base py-3.5 px-6 rounded-full flex items-center justify-center gap-2 border border-[#ffa8bf]/30 shadow-lg transition-all cursor-pointer"
          >
            <Zap className="w-5 h-5 text-[#ffa8bf]" />
            <span>Test Trigger Fullscreen Alarm</span>
          </button>
        </section>

        {/* About App */}
        <section className="bg-[#160810] border border-[#2e0e1e] rounded-2xl p-4 text-center space-y-2">
          <h3 className="font-fraunces text-lg text-[#ffa8bf]">Wakey Wakey v1.0</h3>
          <p className="font-spacemono text-xs text-[#8f6d7d]">
            Connected to Cloud Firestore with real-time sync.
          </p>
        </section>
      </div>
    </div>
  );
};

