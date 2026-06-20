import { Trophy, TrendingUp, UsersRound } from "lucide-react";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (parts[0] || "TM").slice(0, 2).toUpperCase();
};

const toneForProgress = (progress) => {
  if (progress >= 80) return "strong";
  if (progress >= 45) return "steady";
  if (progress > 0) return "starting";
  return "empty";
};

const progressLabel = (member) => {
  if (!member.taskCount) return member.message || "No tasks assigned yet";
  return `${member.averageProgress}% average across ${member.taskCount} task${member.taskCount === 1 ? "" : "s"}`;
};

export default function DepartmentPerformancePulse({ members = [], loading, error }) {
  const currentMember = members.find((member) => member.currentUser);
  const teammates = members.filter((member) => !member.currentUser);
  const orderedMembers = currentMember ? [currentMember, ...teammates] : members;
  const activeMembers = members.filter((member) => member.taskCount > 0);
  const departmentAverage = activeMembers.length
    ? Math.round(activeMembers.reduce((sum, member) => sum + (member.averageProgress || 0), 0) / activeMembers.length)
    : 0;

  return (
    <div className="department-pulse-panel">
      <div className="department-pulse-header">
        <div>
          <span className="department-pulse-kicker">Department pulse</span>
          <h3>Team progress board</h3>
        </div>
        <div className="department-pulse-score">
          <TrendingUp size={16} />
          <span>{departmentAverage}%</span>
        </div>
      </div>

      {loading ? (
        <div className="department-pulse-empty">Loading department progress...</div>
      ) : error ? (
        <div className="department-pulse-empty error">{error}</div>
      ) : orderedMembers.length === 0 ? (
        <div className="department-pulse-empty">No department teammates available yet.</div>
      ) : (
        <div className="department-pulse-list">
          {orderedMembers.map((member, index) => {
            const tone = toneForProgress(member.averageProgress);
            return (
              <article
                className={`department-pulse-row ${member.currentUser ? "self" : ""} ${tone}`}
                key={member.empId}
              >
                <div className="department-pulse-rank">
                  {member.currentUser ? <Trophy size={15} /> : index + 1}
                </div>
                <div className="department-pulse-avatar">{getInitials(member.name)}</div>
                <div className="department-pulse-copy">
                  <div className="department-pulse-name-line">
                    <strong>{member.currentUser ? "You" : member.name}</strong>
                    {member.departmentLead && <span>Dept Lead</span>}
                  </div>
                  <p>{progressLabel(member)}</p>
                  <div className="department-pulse-track">
                    <div style={{ width: `${member.averageProgress || 0}%` }}></div>
                  </div>
                </div>
                <div className="department-pulse-percent">
                  <span>{member.taskCount ? `${member.averageProgress}%` : "--"}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="department-pulse-note">
        <UsersRound size={15} />
        <span>Progress is calculated from each member's assigned task averages.</span>
      </div>
    </div>
  );
}
