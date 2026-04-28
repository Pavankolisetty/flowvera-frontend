import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";

const summaryConfig = [
  {
    key: "dueToday",
    label: "Due today",
    icon: CalendarClock,
    tone: "today",
  },
  {
    key: "overdue",
    label: "Overdue",
    icon: AlertTriangle,
    tone: "urgent",
  },
  {
    key: "underReview",
    label: "Under review",
    icon: ClipboardCheck,
    tone: "review",
  },
  {
    key: "completedThisWeek",
    label: "Completed this week",
    icon: CheckCircle2,
    tone: "complete",
  },
];

const TodaySummaryStrip = ({ summary, loading = false }) => (
  <section className="today-summary-strip" aria-label="Today task summary">
    {summaryConfig.map((item) => {
      const Icon = item.icon;
      return (
        <div className={`today-summary-card ${item.tone}`} key={item.key}>
          <span className="today-summary-icon">
            <Icon size={18} />
          </span>
          <span className="today-summary-copy">
            <strong>{loading ? "..." : summary[item.key] || 0}</strong>
            <span>{item.label}</span>
          </span>
        </div>
      );
    })}
  </section>
);

export default TodaySummaryStrip;
