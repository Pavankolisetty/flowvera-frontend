import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

const sequenceTransition = {
  repeat: Infinity,
  repeatDelay: 1,
  duration: 7,
  ease: "easeInOut",
}

const FeaturesSection = () => {
  return (
    <section className="features-section" id="features">
      <div className="container">

        {/* Productivity Section */}
        <motion.div
          className="productivity-section"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="section-title">
            Boost Your Productivity<br />
            Achieve More Together
          </h2>

          <div className="productivity-content">
            {/* LEFT SIDE — UNCHANGED */}
            <div className="productivity-text">
              <h3 className="productivity-heading">
                Experience seamless workflow,<br />
                celebrate achievements and<br />
                watch your productivity soar<br />
                to new heights
              </h3>

              <div className="motivation-points">
                <div className="motivation-point">
                  <span className="point-icon">✨</span>
                  <span>Turn tasks into achievements</span>
                </div>
                <div className="motivation-point">
                  <span className="point-icon">🎉</span>
                  <span>Celebrate every milestone</span>
                </div>
                <div className="motivation-point">
                  <span className="point-icon">📈</span>
                  <span>Track your growth journey</span>
                </div>
              </div>

              <a href="#" className="productivity-link">
                Start Your Journey <ArrowRight size={16} />
              </a>
            </div>

            {/* RIGHT SIDE — HORIZONTAL ANIMATION */}
            <div className="work-animation">
              <motion.div
                className="horizontal-flow-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flow-track">

                  {/* STEP 1 */}
                  <motion.div
                    className="flow-step"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ ...sequenceTransition, times: [0, 0.1, 0.25, 0.3] }}
                  >
                    <span className="flow-icon">📝</span>
                    <p>Task Created</p>
                  </motion.div>

                  {/* STEP 2 */}
                  <motion.div
                    className="flow-step"
                    animate={{ opacity: [0, 0, 1, 1, 0] }}
                    transition={{ ...sequenceTransition, times: [0, 0.25, 0.35, 0.5, 0.55] }}
                  >
                    <span className="flow-icon">👤</span>
                    <p>Assigned</p>
                  </motion.div>

                  {/* STEP 3 */}
                  <motion.div
                    className="flow-step"
                    animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                    transition={{ ...sequenceTransition, times: [0, 0.5, 0.55, 0.65, 0.75, 0.8] }}
                  >
                    <span className="flow-icon">✅</span>
                    <p>Submitted</p>
                  </motion.div>

                  {/* STEP 4 — PERFORMANCE LINE GRAPH */}
                  <motion.div
                    className="flow-step performance-graph-step"
                    animate={{ opacity: [0, 0, 0, 1, 1, 0] }}
                    transition={{ ...sequenceTransition, times: [0, 0.65, 0.7, 0.8, 0.9, 1] }}
                  >
                    <span className="flow-icon transparent-icon">📈</span>
                    <p>Performance</p>
                    <div className="line-graph-container">
                      <svg className="line-graph" viewBox="0 0 200 80" width="200" height="80">
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{stopColor: '#4f46e5', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: '#10b981', stopOpacity: 1}} />
                          </linearGradient>
                          <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.3}} />
                            <stop offset="100%" style={{stopColor: '#10b981', stopOpacity: 0}} />
                          </linearGradient>
                        </defs>
                        
                        {/* Grid lines */}
                        <line x1="20" y1="20" x2="180" y2="20" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="20" y1="40" x2="180" y2="40" stroke="#e5e7eb" strokeWidth="0.5" />
                        <line x1="20" y1="60" x2="180" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
                        
                        {/* Performance line path */}
                        <motion.path
                          d="M20,60 Q60,50 80,45 T120,35 T160,20 L180,15"
                          stroke="url(#lineGradient)"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                        />
                        
                        {/* Fill area under curve */}
                        <motion.path
                          d="M20,60 Q60,50 80,45 T120,35 T160,20 L180,15 L180,60 L20,60 Z"
                          fill="url(#fillGradient)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1, delay: 1.5 }}
                        />
                        
                        {/* Data points */}
                        <motion.circle cx="20" cy="60" r="3" fill="#4f46e5"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 2 }} />
                        <motion.circle cx="80" cy="45" r="3" fill="#7c3aed"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 2.2 }} />
                        <motion.circle cx="120" cy="35" r="3" fill="#059669"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 2.4 }} />
                        <motion.circle cx="180" cy="15" r="3" fill="#10b981"
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 2.6 }} />
                      </svg>
                      
                      <motion.div 
                        className="performance-increase-label"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 3 }}
                      >
                        🚀 +45% Performance ↗️
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* CELEBRATION */}
                  <motion.div
                    className="celebration-badge"
                    animate={{ scale: [0, 1.2, 1, 0] }}
                    transition={{ ...sequenceTransition, times: [0.7, 0.8, 0.9, 1] }}
                  >
                    🎉 Success
                  </motion.div>

                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FeaturesSection