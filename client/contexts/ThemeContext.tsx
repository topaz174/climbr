import React, { createContext, useContext, ReactNode } from "react";
import { AppColors } from "@/constants/theme";

interface ThemeContextValue {
  accentColor: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  accentColor: AppColors.primary,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  accentColor?: string;
}

export const ThemeProvider = ({ children, accentColor = AppColors.primary }: ThemeProviderProps) => {
  return (
    <ThemeContext.Provider value={{ accentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};
