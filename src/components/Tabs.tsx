import { useSearchParams } from "react-router";
import { cn } from "../lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  paramName?: string;
  containerClassName?: string;
  onChange?: (id: string) => void;
}

export default function Tabs({
  tabs,
  defaultTabId,
  paramName = "tab",
  containerClassName,
  onChange,
}: TabsProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Read tab from URL, fallback to defaultTabId or first tab ID
  const fallbackId = defaultTabId || tabs[0]?.id;
  const activeTabId = searchParams.get(paramName) || fallbackId;

  // 2. Handle tab switching by updating URL search params
  const handleTabClick = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(paramName, id);
        return next;
      },
      { replace: true } // replace history entry so back button navigation stays clean
    );

    if (onChange) onChange(id);
  };

  // 3. Match active tab content
  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  return (
    <div className={cn("w-full flex flex-col gap-6", containerClassName)}>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
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