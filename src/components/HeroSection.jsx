import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <img
              src="/assets/vyaas.jpeg"
              alt="Vyaas Technologies"
              className="brand-logo"
            />{" "}
            <span className="brand-name">Vyaas Technologies</span>
          </div>
          <div className="nav-menu">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <button className="nav-login" onClick={() => navigate("/login")}>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="hero-container">
        <div className="hero-content">
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="typewriter-text">Speed, Clarity and Scale</span>
            <br />
            for <span className="hero-highlight">Modern Team</span>
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            The workflow management platform built for today's complex,
            <br />
            global business environment.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              Request a Demo
              <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>

        {/* Company Section */}
        <motion.div
          className="company-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          <div className="company-header">
            <div className="company-logo">
              <img
                src="/assets/vyaas.jpeg"
                alt="Vyaas Technologies"
                className="company-logo-img"
              />
            </div>
            <div className="company-content">
              <h2 className="company-name">Vyaas Technologies</h2>
              <p className="company-fullform">
                Vital Yield for Accurate Alleviation System
              </p>
              <p className="company-tagline">
                "Empowering Excellence, Driving Innovation - Your Success is Our
                Mission!"
              </p>
            </div>
          </div>

          <div className="motivation-grid">
            <div className="motivation-item">
              <div className="motivation-icon">🚀</div>
              <div className="motivation-text">
                <h4>Innovation First</h4>
                <p>Leading the future with cutting-edge solutions</p>
              </div>
            </div>
            <div className="motivation-item">
              <div className="motivation-icon">⚡</div>
              <div className="motivation-text">
                <h4>Peak Performance</h4>
                <p>Delivering excellence in every project</p>
              </div>
            </div>
            <div className="motivation-item">
              <div className="motivation-icon">🎯</div>
              <div className="motivation-text">
                <h4>Goal Achievers</h4>
                <p>Turning visions into successful realities</p>
              </div>
            </div>
            <div className="motivation-item">
              <div className="motivation-icon">🏆</div>
              <div className="motivation-text">
                <h4>Team Excellence</h4>
                <p>Building stronger teams, achieving bigger dreams</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
