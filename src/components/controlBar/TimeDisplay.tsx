import { useState } from "react";
import { formatSeconds } from "./shared";

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

export function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  const [showRemainingTime, setShowRemainingTime] = useState(false);

  return (
    <div
      onClick={() => setShowRemainingTime(!showRemainingTime)}
      className="text-[10px] sm:text-xs font-mono text-neutral-300 hover:text-white cursor-pointer transition select-none ml-1 whitespace-nowrap truncate max-w-[130px] sm:max-w-none"
      title="Click to toggle remaining time"
    >
      <span>{formatSeconds(currentTime)}</span>
      <span className="text-neutral-500 mx-0.5 sm:mx-1">/</span>
      <span>
        {showRemainingTime && duration > 0
          ? `-${formatSeconds(Math.max(0, duration - currentTime))}`
          : formatSeconds(duration)}
      </span>
    </div>
  );
}
