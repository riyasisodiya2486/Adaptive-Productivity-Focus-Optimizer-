import React, { createContext, useContext, useState, ReactNode } from "react";

// Types for your data
interface ActiveApp {
  name: string;
  status: string;
  time: string;
  color: string;
}

interface Recommendation {
  text: string;
  border: string;
}

interface FocusData {
  time: string;
  focus: number;
}

interface Highlights {
  productiveTime: string;
  distractingTime: string;
  breaksTaken: number;
  focusSessions: number;
}

interface DashboardData {
  focusScore: number;
  focusStatus: string;
  sessionDuration: string;
  sessionStart: string;
  todaysHighlights: Highlights;
  activeApps: ActiveApp[];
  recommendations: Recommendation[];
  focusTrend: FocusData[];
  setDashboardData: React.Dispatch<React.SetStateAction<Omit<DashboardData, "setDashboardData">>>;
}

const DashboardContext = createContext<DashboardData | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [dashboardData, setDashboardData] = useState<Omit<DashboardData, "setDashboardData">>({
    focusScore: 78,
    focusStatus: "Good Focus",
    sessionDuration: "02:25",
    sessionStart: "9:00 AM",
    todaysHighlights: {
      productiveTime: "3h 41m",
      distractingTime: "23m",
      breaksTaken: 2,
      focusSessions: 3,
    },
    activeApps: [
      { name: "VS Code", status: "Productive", time: "2h 25m", color: "text-green-500" },
      { name: "Chrome", status: "Neutral", time: "1h 29m", color: "text-gray-500" },
      { name: "Slack", status: "Productive", time: "34m", color: "text-green-500" },
      { name: "YouTube", status: "Distracting", time: "23m", color: "text-orange-500" },
    ],
    recommendations: [
      { text: "Take a 5-minute break. You’ve been focusing for 90 minutes straight!", border: "border-l-2 border-yellow-400" },
      { text: "Consider blocking YouTube during focus hours to boost productivity.", border: "border-l-2 border-purple-500" },
    ],
    focusTrend: [
      { time: "10 AM", focus: 75 },
      { time: "11 AM", focus: 72 },
      { time: "12 PM", focus: 68 },
      { time: "1 PM", focus: 80 },
      { time: "2 PM", focus: 77 },
    ],
  });

  return (
    <DashboardContext.Provider value={{ ...dashboardData, setDashboardData }}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook to use dashboard context
export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
};
