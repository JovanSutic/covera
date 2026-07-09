import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TabsProps } from "@/types/component.types";

export default function Tabs({
  tabs,
  defaultTabId,
  onChange,
  containerClassName,
}: TabsProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
    if (onChange) onChange(id);
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className={cn("w-full flex flex-col gap-6", containerClassName)}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-base whitespace-nowrap transition-all duration-200 cursor-pointer focus:outline-none",
                  isActive
                    ? "border-black text-black"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon && (
                  <span
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-black" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  >
                    {tab.icon}
                  </span>
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="w-full flex-1 animate-fadeIn">
        {activeTab?.content}
      </div>
    </div>
  );
}