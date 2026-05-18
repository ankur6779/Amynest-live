import React, { createContext, useContext, useState, useCallback } from "react";

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  toggleDrawer: () => {},
});

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => {
    try {
      setIsOpen(true);
    } catch (err) {
      console.error("[amynest:nav] openDrawer failed", err);
    }
  }, []);
  const closeDrawer = useCallback(() => {
    try {
      setIsOpen(false);
    } catch (err) {
      console.error("[amynest:nav] closeDrawer failed", err);
    }
  }, []);
  const toggleDrawer = useCallback(() => {
    try {
      setIsOpen((v) => !v);
    } catch (err) {
      console.error("[amynest:nav] toggleDrawer failed", err);
    }
  }, []);

  return (
    <DrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </DrawerContext.Provider>
  );
}

export const useDrawer = () => useContext(DrawerContext);
