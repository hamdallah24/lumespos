interface GreetingSectionProps {
  userName: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function GreetingSection({ userName }: GreetingSectionProps) {
  const greeting = getGreeting();
  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="px-6 pt-6">
      <h1 className="text-[32px] font-bold text-[#111827] leading-none tracking-tight">
        {greeting}, {firstName} <span className="inline-block">👋</span>
      </h1>
      <p className="text-[15px] text-[#6B7280] mt-2 font-medium">
        Business is running great today.
      </p>
    </div>
  );
}
