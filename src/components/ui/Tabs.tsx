"use client";

import { useState, useId, type ReactNode, type KeyboardEvent } from "react";

interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  defaultTab?: string;
  className?: string;
}

function Tabs({ tabs, defaultTab, className = "" }: TabsProps) {
  const prefix = useId();
  const [activeId, setActiveId] = useState(defaultTab ?? tabs[0]?.id ?? "");

  const activeIndex = tabs.findIndex((t) => t.id === activeId);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    let newIndex = activeIndex;
    if (e.key === "ArrowRight") {
      newIndex = (activeIndex + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      newIndex = (activeIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      newIndex = 0;
    } else if (e.key === "End") {
      newIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    setActiveId(tabs[newIndex].id);
    const btn = document.getElementById(`${prefix}-tab-${tabs[newIndex].id}`);
    btn?.focus();
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Tabs"
        className="flex flex-wrap gap-2 border-b border-cyan-400/15 pb-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`${prefix}-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${prefix}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onKeyDown={handleKeyDown}
              onClick={() => setActiveId(tab.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                isActive
                  ? "border border-cyan-300/50 bg-cyan-400/20 text-cyan-50"
                  : "border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-400/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${prefix}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${prefix}-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          tabIndex={0}
          className="mt-4 focus:outline-none"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

export { Tabs };
export type { TabsProps, TabDef };
