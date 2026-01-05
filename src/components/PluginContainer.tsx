"use client";

import { ReactNode, Suspense } from "react";
import { PluginPosition } from "@/lib/plugins/types";

// Visible positions only (exclude "hidden")
export type VisiblePluginPosition = Exclude<PluginPosition, "hidden">;

// Extended positions with bottom-center
export type ExtendedPluginPosition = VisiblePluginPosition | "bottom-center";

interface PluginContainerProps {
  position: ExtendedPluginPosition;
  children: ReactNode;
}

// Safe zone margins: top/bottom 10%, left/right 8%
// Position CSS classes with safe zone margins
const positionClasses: Record<ExtendedPluginPosition, string> = {
  "top-left": "top-[10%] left-[8%]",
  "top-right": "top-[10%] right-[8%]",
  "bottom-left": "bottom-[10%] left-[8%]",
  "bottom-right": "bottom-[10%] right-[8%]",
  "bottom-center": "bottom-[10%] left-1/2 -translate-x-1/2",
};

// Alignment classes for stacking multiple plugins
const alignmentClasses: Record<ExtendedPluginPosition, string> = {
  "top-left": "items-start",
  "top-right": "items-end",
  "bottom-left": "items-start",
  "bottom-right": "items-end",
  "bottom-center": "items-center",
};

function PluginFallback() {
  return (
    <div className="animate-pulse bg-white/5 rounded-lg p-4 min-w-[120px] plugin-shadow">
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
      <Suspense fallback={<PluginFallback />}>
        <div className="plugin-shadow">{children}</div>
      </Suspense>
    </div>
  );
}

interface PluginLayoutProps {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  bottomCenter?: ReactNode;
}

export function PluginLayout({
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  bottomCenter,
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
      {bottomCenter && (
        <PluginSlot position="bottom-center">{bottomCenter}</PluginSlot>
      )}
    </>
  );
}
