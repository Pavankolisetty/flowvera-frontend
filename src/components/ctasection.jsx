import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* News Section */}
      <section className="news-section">
        <div className="container">
          <motion.div
            className="news-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="section-title">Internal Updates</h2>
          </motion.div>

          <motion.div
            className="news-links"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <a href="#" className="news-link">
              Task dependency feature successfully deployed
            </a>
            <a href="#" className="news-link">
              Performance dashboard updated for team leads
            </a>
            <a href="#" className="news-link">
              Sprint analytics improvements released
            </a>
            <a href="#" className="news-link">
              Role-based access control enhancements applied
            </a>
            <a href="#" className="news-link">
              Scheduled system maintenance completed
            </a>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="contact">
        <div className="container">
          <motion.div
            className="cta-grid"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="cta-image">
              <motion.img
                src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=900&q=80"
                alt="Internal Team Collaboration"
                className="cta-img"
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>

            <div className="cta-content">
              <h3 className="cta-title">Access the Flowvera Platform</h3>

              <div className="cta-buttons">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/login")}
                >
                  Go to Dashboard
                  <ArrowRight size={16} />
                </button>

                <a href="#" className="btn btn-outline">
                  View Guidelines
                </a>
              </div>

              <div className="cta-social">
                <a href="#" className="social-link">
                  Internal Tool
                </a>
                <a href="#" className="social-link">
                  Version 1.0
                </a>
                <a href="#" className="social-link">
                  Authorized Access
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column">
              <h4>PLATFORM</h4>
              <a href="#">Dashboard</a>
              <a href="#">Tasks</a>
            </div>

            <div className="footer-column">
              <h4>TEAMS</h4>
              <a href="#">Development</a>
              <a href="#">Design</a>
              <a href="#">Operations</a>
            </div>

            <div className="footer-column">
              <h4>FEATURES</h4>
              <a href="#">Task Tracking</a>
              <a href="#">Team Collaboration</a>
              <a href="#">Analytics</a>
              <a href="#">Integrations</a>
            </div>

            <div className="footer-column">
              <h4>SUPPORT</h4>
              <a href="#">Usage Guide</a>
              <a href="#">System Status</a>
            </div>
          </div>

          <div className="footer-address">
            <h4>INTERNAL NOTICE</h4>
            <p>
              This platform is intended for internal use only.
              <br />
              Access is restricted to authorized employees.
            </p>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Flowvera – Internal Task Management System</p>
            <p>Confidential • Not for public distribution</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default CTASection;
