import DashboardNotifications from "./DashboardNotifications";

const QUOTES = [
  "Success is the sum of small efforts repeated daily.",
  "Focus on progress, not perfection.",
  "Great work grows from steady, intentional habits.",
  "Clarity today builds momentum tomorrow.",
  "Excellence is a habit, not an act.",
  "Small steps lead to big achievements.",
  "Consistency is the mother of mastery.",
  "Today's discipline is tomorrow's freedom.",
  "Progress over perfection, every single day.",
  "Your potential is limitless when you stay focused."
];

const getDailyQuote = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  return QUOTES[dayOfYear % QUOTES.length];
};

const QuoteSection = ({ notifications = [], notificationsOpen, onOpenNotifications, onCloseNotifications }) => {
  const dailyQuote = getDailyQuote();

  return (
    <section className="employee-quote">
      <div className="quote-copy">
        <span className="quote-label">Today's focus</span>
        <h2>{dailyQuote}</h2>
      </div>
      <DashboardNotifications
        notifications={notifications}
        open={notificationsOpen}
        onOpen={onOpenNotifications}
        onClose={onCloseNotifications}
      />
    </section>
  );
};

export default QuoteSection;
