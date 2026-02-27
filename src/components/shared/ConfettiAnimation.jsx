import { useEffect, useState } from 'react';

const ConfettiAnimation = ({ show, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      // Create more confetti particles with enhanced professional colors and shapes
      const newParticles = [];
      const professionalColors = [
        '#4ECDC4', '#45B7D1', '#96CEB4', '#6C63FF', '#667eea', 
        '#764ba2', '#f093fb', '#667db6', '#0082c8', '#667eea',
        '#667eea', '#764ba2', '#f64f59', '#c471ed', '#12c2e9',
        '#c471ed', '#ff9a9e', '#fecfef', '#fda085', '#9890e3'
      ];
      const shapes = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
      
      for (let i = 0; i < 120; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -30,
          vx: (Math.random() - 0.5) * 16,
          vy: Math.random() * 6 + 4,
          color: professionalColors[Math.floor(Math.random() * professionalColors.length)],
          size: Math.random() * 12 + 8,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
          opacity: 1,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          wobble: Math.random() * 0.03 + 0.02,
          bounce: 0.6 + Math.random() * 0.3,
          hasBouncedOnce: false
        });
      }
      setParticles(newParticles);

      // Extended professional animation - 12 seconds for better employee boost
      const timeout = setTimeout(() => {
        setParticles([]);
        onComplete && onComplete();
      }, 12000);

      return () => clearTimeout(timeout);
    }
  }, [show, onComplete]);

  useEffect(() => {
    if (particles.length === 0) return;

    const animateParticles = () => {
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          let newY = particle.y + particle.vy;
          let newVy = particle.vy + 0.4; // Enhanced gravity
          let newX = particle.x + particle.vx + Math.sin(Date.now() * particle.wobble) * 3;
          let newVx = particle.vx;
          let newOpacity = particle.opacity;
          let bounced = particle.hasBouncedOnce;
          
          // Ground bounce effect for better visual appeal
          if (newY > window.innerHeight - 50 && !particle.hasBouncedOnce) {
            newY = window.innerHeight - 50;
            newVy = -particle.vy * particle.bounce;
            newVx = particle.vx * 0.8; // friction
            bounced = true;
          }
          
          // Wall bounce
          if (newX < 0 || newX > window.innerWidth) {
            newVx = -particle.vx * 0.7;
            newX = Math.max(0, Math.min(window.innerWidth, newX));
          }
          
          // Gradual fade after 8 seconds for professional feel
          if (Date.now() - particle.createdAt > 8000) {
            newOpacity = Math.max(0, particle.opacity - 0.015);
          }
          
          return {
            ...particle,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            rotation: particle.rotation + particle.rotationSpeed,
            opacity: newOpacity,
            hasBouncedOnce: bounced,
            createdAt: particle.createdAt || Date.now()
          };
        }).filter(particle => particle.y < window.innerHeight + 200 && particle.opacity > 0.05)
      );
    };

    const interval = setInterval(animateParticles, 16); // ~60fps
    return () => clearInterval(interval);
  }, [particles.length > 0]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map(particle => {
        let particleStyle = {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          transform: `rotate(${particle.rotation}deg)`,
          opacity: particle.opacity,
          position: 'fixed',
          zIndex: 9999,
          pointerEvents: 'none'
        };

        // Enhanced professional shapes
        switch(particle.shape) {
          case 'circle':
            particleStyle.borderRadius = '50%';
            break;
          case 'square':
            // Default square shape
            break;
          case 'triangle':
            particleStyle.width = 0;
            particleStyle.height = 0;
            particleStyle.backgroundColor = 'transparent';
            particleStyle.borderLeft = `${particle.size/2}px solid transparent`;
            particleStyle.borderRight = `${particle.size/2}px solid transparent`;
            particleStyle.borderBottom = `${particle.size}px solid ${particle.color}`;
            break;
          case 'star':
            particleStyle.clipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
            break;
          case 'heart':
            particleStyle.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
            particleStyle.transform += ' rotate(-45deg)';
            break;
          case 'diamond':
            particleStyle.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
            break;
          default:
            particleStyle.borderRadius = '50%';
        }

        return (
          <div
            key={particle.id}
            className="confetti-particle"
            style={particleStyle}
          />
        );
      })}
    </div>
  );
};

export default ConfettiAnimation;