import React, { useEffect, useState, memo } from 'react';

const BackgroundParticles = memo(function BackgroundParticles() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate 45 glowing star particles with depth-of-field blur effects
    const generatedStars = Array.from({ length: 45 }).map((_, i) => {
      const size = Math.random() * 2.5 + 1.5; // size: 1.5px to 4px
      const colors = [
        { name: 'bg-accent', glow: 'shadow-[0_0_12px_rgba(0,210,255,0.75)]' },
        { name: 'bg-indigo', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.75)]' },
        { name: 'bg-white', glow: 'shadow-[0_0_12px_rgba(255,255,255,0.65)]' }
      ];
      const colorScheme = colors[Math.floor(Math.random() * colors.length)];
      const opacity = Math.random() * 0.35 + 0.6; // opacity: 0.6 to 0.95

      // Add depth of field: smaller stars can be more blurred or sharper
      const blurOptions = ['blur-0', 'blur-[0.5px]', 'blur-[1px]', 'blur-[1.5px]'];
      const blurClass = blurOptions[Math.floor(Math.random() * blurOptions.length)];
      
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${size}px`,
        colorClass: colorScheme.name,
        glowClass: colorScheme.glow,
        blurClass,
        opacity,
        duration: `${Math.random() * 13 + 8}s`, // 8s to 21s
        delay: `${Math.random() * -21}s`, // Negative delay pre-fills screen
      };
    });
    setStars(generatedStars);
  }, []);

  return (
    <div 
      className="fixed inset-0 h-screen overflow-hidden pointer-events-none z-0"
      style={{
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
        willChange: 'transform',
        contain: 'strict',
        isolation: 'isolate',
      }}
    >
      {stars.map(star => (
        <div
          key={star.id}
          className={`absolute rounded-full animate-falling-star ${star.colorClass} ${star.glowClass} ${star.blurClass}`}
          style={{
            left: star.left,
            width: star.size,
            height: star.size,
            '--star-opacity': star.opacity,
            animationDuration: star.duration,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
});

export default BackgroundParticles;
