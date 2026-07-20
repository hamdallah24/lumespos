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
    <div className="px-6" style={{ paddingTop: 32, paddingBottom: 12 }}>
      <h1
        className="text-[36px] font-bold text-[#111827] tracking-[-0.02em]"
        style={{ lineHeight: "42px" }}
      >
        {greeting}, {firstName} <span className="inline-block">👋</span>
      </h1>
      <p className="text-[14px] text-[#6B7280] font-medium mt-1.5">
        Business is running great today.
      </p>
    </div>
  );
}
