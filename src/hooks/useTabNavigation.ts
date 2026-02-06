import { useCallback, useEffect, useState } from "react";
import { useSwipe } from "./useSwipe";
import type { TabKey } from "../components/layout/TabNavigation";

const tabOrder: TabKey[] = ["input", "history", "summary", "budget"];

export function useTabNavigation() {
  const [activeTab, setActiveTab] = useState<TabKey>("input");
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  const handleSwipeLeft = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setSlideDirection("left");
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  }, [activeTab]);

  const handleSwipeRight = useCallback(() => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setSlideDirection("right");
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  }, [activeTab]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const handleTabChange = useCallback((key: TabKey) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(key);

    if (nextIndex > currentIndex) {
      setSlideDirection("left");
    } else if (nextIndex < currentIndex) {
      setSlideDirection("right");
    } else {
      setSlideDirection(null);
    }

    setActiveTab(key);
  }, [activeTab]);

  // Clear slide direction after animation completes
  useEffect(() => {
    if (slideDirection) {
      const timer = setTimeout(() => {
        setSlideDirection(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [slideDirection]);

  return {
    activeTab,
    setActiveTab,
    slideDirection,
    swipeHandlers,
    handleTabChange,
  };
}
