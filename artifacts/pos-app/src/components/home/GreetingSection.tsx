interface GreetingSectionProps {
  userName: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 17) return "Selamat Siang";
  return "Selamat Malam";
}

export default function GreetingSection({ userName }: GreetingSectionProps) {
  const greeting = getGreeting();
  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="px-5 pt-4 pb-2" style={{ background: "#F6F8FC" }}>
      <h1 className="text-[22px] font-bold text-[#111827] leading-tight">
        {greeting}, {firstName} 👋
      </h1>
      <p className="text-[13px] text-[#6B7280] mt-1">
        Bisnis berjalan lancar hari ini.
      </p>
    </div>
  );
}
