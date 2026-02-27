import { motion } from "framer-motion"

const AboutSection = () => {
  return (
    <section className="problem-section" id="about">
      <div className="container">
        {/* Problem Statement */}
        <motion.div
          className="problem-statement"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="section-title">
            The business world still operates on outdated
            <br />workflow systems built in the 1990s
          </h2>
        </motion.div>

        {/* Problem Illustration */}
        <motion.div
          className="problem-visual"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="problem-box">
            <div className="problem-icon">📊</div>
            <p>Legacy spreadsheet workflows</p>
          </div>
        </motion.div>

        {/* Leading to problems */}
        <motion.div
          className="consequences"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="section-title">
            Leading to inefficiencies, reduced profit margins
            <br />and increased operational risk
          </h2>
        </motion.div>

        {/* Solution */}
        <motion.div
          className="solution"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="section-title">
            A technology-driven platform designed for
            <br />today's complex, global business environment
          </h2>
        </motion.div>
      </div>
    </section>
  )
}

export default AboutSection