import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import StatusBar from "./StatusBar";
import HomeHeader from "./HomeHeader";
import GreetingSection from "./GreetingSection";
import RuntimeStatus from "./RuntimeStatus";
import BusinessOverview from "./BusinessOverview";
import DigitalTwinHero from "./DigitalTwinHero";
import ApplicationGrid from "./ApplicationGrid";
import AIInsight from "./AIInsight";
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#F6F8FC" }}
    >
      {/* App Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F6F8FC] active:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#111827]" />
        </button>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${app.color}15` }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: app.color }}
          />
        </div>
        <span className="text-[15px] font-bold text-[#111827]">
          {app.title}
        </span>
      </div>

      {/* App Content */}
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
    <div className="flex-1 overflow-auto pb-24">
      <GreetingSection userName={userName} />
      <RuntimeStatus />
      <BusinessOverview />
      <DigitalTwinHero />
      <ApplicationGrid onAppClick={onAppClick} />
      {!isMobile && <CashflowWidget />}
      {!isMobile && <UpcomingScheduleWidget />}
      <AIInsight />
      {!isMobile && <MissionsRunningWidget />}
    </div>
  );
}

function AppsView({ onAppClick }: { onAppClick: (id: string) => void }) {
  return (
    <div className="flex-1 overflow-auto pb-24 px-5 pt-4">
      <h2 className="text-[18px] font-bold text-[#111827] mb-4">
        Semua Aplikasi
      </h2>
      <ApplicationGrid onAppClick={onAppClick} />
    </div>
  );
}

function MissionView() {
  return (
    <div className="flex-1 flex items-center justify-center pb-24 px-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#2563EB10] flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🎯</span>
        </div>
        <p className="text-[15px] font-bold text-[#111827]">Misi</p>
        <p className="text-[12px] text-[#6B7280] mt-1">
          Panel misi akan segera hadir.
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
    <div className="flex-1 overflow-auto pb-24 px-5 pt-4">
      <h2 className="text-[18px] font-bold text-[#111827] mb-4">Profil</h2>
      <div
        className="rounded-2xl bg-white p-5"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white text-[20px] font-bold">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#111827]">
              {user?.name || "User"}
            </p>
            <p className="text-[12px] text-[#6B7280]">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#2563EB10] text-[10px] font-medium text-[#2563EB] capitalize">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full py-3 rounded-xl bg-[#EF4444] text-white text-[14px] font-semibold active:bg-red-600 transition-colors"
        >
          Keluar
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

      {/* Tab content */}
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

      {/* App overlay */}
      <AnimatePresence>
        {activeApp && (
          <AppView appId={activeApp} onBack={handleBack} />
        )}
      </AnimatePresence>
    </div>
  );
}
