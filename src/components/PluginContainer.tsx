"use client";

import { ReactNode, Suspense } from "react";
import { PluginPosition } from "@/lib/plugins/types";

interface PluginContainerProps {
  position: PluginPosition;
  children: ReactNode;
}

// Position CSS classes
const positionClasses: Record<PluginPosition, string> = {
  "top-left": "top-12 left-12",
  "top-right": "top-12 right-12",
  "bottom-left": "bottom-12 left-12",
  "bottom-right": "bottom-12 right-12",
};

// Alignment classes for stacking multiple plugins
const alignmentClasses: Record<PluginPosition, string> = {
  "top-left": "items-start",
  "top-right": "items-end",
  "bottom-left": "items-start",
  "bottom-right": "items-end",
};

function PluginFallback() {
  return (
    <div className="animate-pulse bg-white/5 rounded-lg p-4 min-w-[120px]">
      <div className="h-4 bg-white/10 rounded w-20 mb-2" />
      <div className="h-8 bg-white/10 rounded w-32" />
    </div>
  );
}

export function PluginSlot({ position, children }: PluginContainerProps) {
  if (!children) return null;

  return (
    <div
      className={`absolute ${positionClasses[position]} flex flex-col gap-3 ${alignmentClasses[position]} z-20 pointer-events-auto`}
    >
      <Suspense fallback={<PluginFallback />}>{children}</Suspense>
    </div>
  );
}

interface PluginLayoutProps {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
}

export function PluginLayout({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
}: PluginLayoutProps) {
  return (
    <>
      {topLeft && <PluginSlot position="top-left">{topLeft}</PluginSlot>}
      {topRight && <PluginSlot position="top-right">{topRight}</PluginSlot>}
      {bottomLeft && (
        <PluginSlot position="bottom-left">{bottomLeft}</PluginSlot>
      )}
      {bottomRight && (
        <PluginSlot position="bottom-right">{bottomRight}</PluginSlot>
      )}
    </>
  );
}
