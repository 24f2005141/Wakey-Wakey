import React, { useEffect } from 'react';
import { MapPin, Navigation, CheckCircle, Clock, Volume2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Alarm, UserLocation } from '../types';
import { formatDistance, getDistanceInMeters } from '../utils/geo';
import { startAlarmSound, stopAlarmSound } from '../utils/audio';

interface AlarmTriggeredScreenProps {
  alarm: Alarm;
  userLocation: UserLocation;
  onDismiss: () => void;
  onSnooze: (minutes?: number) => void;
}

export const AlarmTriggeredScreen: React.FC<AlarmTriggeredScreenProps> = ({
  alarm,
  userLocation,
  onDismiss,
  onSnooze,
}) => {
  // Start looping sound and vibration when screen mounts
  useEffect(() => {
    startAlarmSound(alarm.sound, alarm.vibration, alarm.alarmTone || 'gentle_chime');

    return () => {
      stopAlarmSound();
    };
  }, [alarm]);

  const currentDistance = getDistanceInMeters(
    userLocation.lat,
    userLocation.lng,
    alarm.lat,
    alarm.lng
  );

  const handleDismiss = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopAlarmSound();
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ffa8bf', '#f06292', '#ffffff', '#ff4081'],
      });
    } catch {
      // ignore
    }
    onDismiss();
  };

  const handleSnooze = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    stopAlarmSound();
    onSnooze(5);
  };

  return (
    <div
      id="alarm-triggered-fullscreen"
      className="fixed inset-0 z-[10000] bg-[#6a152f] text-white flex flex-col items-center justify-between px-6 py-8 overflow-y-auto"
    >
      <div className="w-full max-w-lg flex flex-col items-center justify-between h-full min-h-[580px] my-auto">
        {/* Top Section */}
        <div className="w-full flex flex-col items-center text-center space-y-3">
          {/* Top Pill Badge matching Image 7 */}
          <div className="bg-[#fca5b9] text-[#6a152f] font-fraunces text-base font-semibold px-6 py-2 rounded-full flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <MapPin className="w-4 h-4 fill-current" />
            <span>Destination Alert</span>
          </div>

          {/* Main Title & Destination Reached */}
          <div className="pt-2">
            <h1 className="font-fraunces text-4xl sm:text-5xl font-bold text-[#ffebf0] tracking-tight drop-shadow-md">
              Wakey Wakey!
            </h1>
            <h2 className="font-fraunces text-xl sm:text-2xl text-[#fcd7e1] mt-1 font-normal">
              Destination Reached: {alarm.name}
            </h2>
          </div>

          {/* Proximity Monospace Badge */}
          <div className="bg-[#520f23]/80 border border-[#8a2448]/50 px-5 py-2 rounded-full flex items-center gap-2 text-xs font-spacemono text-[#fcd7e1] shadow-inner">
            <Navigation className="w-3.5 h-3.5 text-[#ffa8bf] -rotate-45" />
            <span>
              You are now {formatDistance(currentDistance)} away.
            </span>
          </div>
        </div>

        {/* App Icon Showcase */}
        <div className="my-6 w-full max-w-xs sm:max-w-sm aspect-square bg-[#0b0106] rounded-3xl overflow-hidden border-[3px] border-[#4a1325] shadow-2xl relative flex items-center justify-center">
          <img
            src="/icon-512x512.png"
            alt="Wakey Wakey"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Action Buttons Section */}
        <div className="w-full max-w-sm space-y-3 pt-2">
          {/* Dismiss Pill Button */}
          <button
            id="btn-dismiss-alarm"
            onClick={handleDismiss}
            className="w-full bg-[#fca5b9] hover:bg-[#ffb3c6] active:scale-[0.98] text-[#541229] font-fraunces font-semibold text-xl py-4 rounded-full flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
          >
            <CheckCircle className="w-6 h-6 stroke-[2.5]" />
            <span>Dismiss Alarm</span>
          </button>

          {/* Snooze for 5 mins Pill Button */}
          <button
            id="btn-snooze-alarm"
            onClick={handleSnooze}
            className="w-full bg-[#4a0d20] hover:bg-[#591429] active:scale-[0.98] text-[#fce4ec] font-fraunces text-lg py-3.5 rounded-full flex items-center justify-center gap-2 border border-[#8a2448]/60 transition-all cursor-pointer"
          >
            <Clock className="w-5 h-5 text-[#ffa8bf]" />
            <span>Snooze for 5 mins</span>
          </button>
        </div>
      </div>
    </div>
  );
};
