import HeroSection from "../components/HeroSection"
import CTASection from "../components/ctasection"

import "../styles/variables.css"
import "../styles/animations.css"
import "../styles/HomePage.css";
import FeaturesSection from "../components/FeatureSelection"
import AboutSection from "../components/AboutSection"

const HomePage = () => {
  return (
    <div className="homepage">
      <div className="beta-badge">
        <span className="beta-text">BETA</span>
      </div>
      <HeroSection />
      <AboutSection/>
      <FeaturesSection />
      <CTASection />
    </div>
  )
}

export default HomePage