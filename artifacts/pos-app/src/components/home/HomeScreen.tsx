import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import StatusBar from "./StatusBar";
import HomeHeader from "./HomeHeader";
import GreetingSection from "./GreetingSection";
import RuntimeStatus from "./RuntimeStatus";
import BusinessOverview from "./BusinessOverview";
import DigitalTwinHero from "./DigitalTwinHero";
import ApplicationGrid from "./ApplicationGrid";
import AIInsight from "./AIInsight";
import RecentActivity from "./RecentActivity";
import FloatingAI from "./FloatingAI";
import BottomNav, { type BottomTab } from "./BottomNav";
import CashflowWidget from "./desktop/CashflowWidget";
import MissionsRunningWidget from "./desktop/MissionsRunningWidget";
import UpcomingScheduleWidget from "./desktop/UpcomingScheduleWidget";
import { getAppById } from "@/lib/desktop/registry";

interface HomeScreenProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
}

function AppView({
  appId,
  onBack,
}: {
  appId: string;
  onBack: () => void;
}) {
  const app = getAppById(appId);
  if (!app) return null;
  const AppComponent = app.component;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#F6F8FC" }}
    >
      <div
        className="flex items-center gap-3 px-5 shrink-0"
        style={{
          height: 72,
          background: "transparent",
        }}
      >
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 backdrop-blur-sm active:scale-[0.98] transition-transform shadow-sm border border-white/60"
        >
          <ArrowLeft className="w-5 h-5 text-[#111827]" />
        </button>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${app.color}12` }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: app.color }}
          />
        </div>
        <span className="text-[17px] font-bold text-[#111827]">
          {app.title}
        </span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <AppComponent />
      </div>
    </motion.div>
  );
}

function HomeView({
  userName,
  onAppClick,
  isMobile,
}: {
  userName: string;
  onAppClick: (id: string) => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex-1 overflow-auto pb-32">
      <div className="flex flex-col" style={{ gap: 24 }}>
        <GreetingSection userName={userName} />
        <RuntimeStatus />
        <BusinessOverview />
        <DigitalTwinHero />
        <ApplicationGrid onAppClick={onAppClick} />
        {!isMobile && <div className="px-6"><CashflowWidget /></div>}
        {!isMobile && <div className="px-6"><UpcomingScheduleWidget /></div>}
        <AIInsight />
        <RecentActivity />
        {!isMobile && <div className="px-6"><MissionsRunningWidget /></div>}
      </div>
    </div>
  );
}

function AppsView({ onAppClick }: { onAppClick: (id: string) => void }) {
  return (
    <div className="flex-1 overflow-auto pb-32 px-6 pt-4">
      <h2 className="text-[22px] font-bold text-[#111827] mb-5 tracking-tight">
        All Applications
      </h2>
      <ApplicationGrid onAppClick={onAppClick} />
    </div>
  );
}

function MissionView() {
  return (
    <div className="flex-1 flex items-center justify-center pb-32 px-6">
      <div className="text-center">
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-4"
          style={{ background: "#EEF2FF" }}
        >
          <span className="text-3xl">🎯</span>
        </div>
        <p className="text-[18px] font-bold text-[#111827]">Mission Control</p>
        <p className="text-[14px] text-[#6B7280] mt-1.5">
          Coming soon.
        </p>
      </div>
    </div>
  );
}

function ProfileView({
  user,
  onSignOut,
}: {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto pb-32 px-6 pt-4">
      <h2 className="text-[22px] font-bold text-[#111827] mb-5 tracking-tight">
        Profile
      </h2>
      <div
        className="rounded-[24px] bg-white p-6"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 0 0 0.5px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[22px] font-bold shadow-md"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #6366F1)",
              boxShadow: "0 4px 12px rgba(79,70,229,0.3)",
            }}
          >
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[17px] font-bold text-[#111827]">
              {user?.name || "User"}
            </p>
            <p className="text-[13px] text-[#6B7280]">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
              style={{ background: "#EEF2FF", color: "#4F46E5" }}>
              {user?.role || "Owner"}
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold text-white active:scale-[0.98] transition-transform"
          style={{ background: "#EF4444" }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function HomeScreen({ user, onSignOut }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<BottomTab>("home");
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleAppClick = useCallback((appId: string) => {
    setActiveApp(appId);
  }, []);

  const handleBack = useCallback(() => {
    setActiveApp(null);
  }, []);

  const handleAI = useCallback(() => {
    setActiveApp("ai-chat");
  }, []);

  const handleTabChange = useCallback((tab: BottomTab) => {
    if (tab === "ai") {
      setActiveApp("ai-chat");
      return;
    }
    setActiveTab(tab);
  }, []);

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#F6F8FC" }}
    >
      <StatusBar />
      <HomeHeader
        user={user}
        onMenuClick={() => {}}
        onNotificationClick={() => {}}
        onAvatarClick={() => setActiveTab("profile")}
      />

      <AnimatePresence mode="wait">
        {activeTab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <HomeView userName={userName} onAppClick={handleAppClick} isMobile={isMobile} />
          </motion.div>
        )}
        {activeTab === "apps" && (
          <motion.div
            key="apps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <AppsView onAppClick={handleAppClick} />
          </motion.div>
        )}
        {activeTab === "mission" && (
          <motion.div
            key="mission"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <MissionView />
          </motion.div>
        )}
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <ProfileView user={user} onSignOut={onSignOut} />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav active={activeTab} onChange={handleTabChange} />
      <FloatingAI onClick={handleAI} />

      <AnimatePresence>
        {activeApp && (
          <AppView appId={activeApp} onBack={handleBack} />
        )}
      </AnimatePresence>
    </div>
  );
}
