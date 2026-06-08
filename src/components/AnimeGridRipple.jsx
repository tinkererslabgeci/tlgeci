import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

export default function AnimeGridRipple() {
  const containerRef = useRef(null);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [dots, setDots] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const size = 50; 
      const cols = Math.floor(width / size);
      const rows = Math.floor(height / size);
      setGrid({ cols, rows });
      
      const newDots = [];
      for (let i = 0; i < cols * rows; i++) {
        newDots.push(i);
      }
      setDots(newDots);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const size = 50;
    const col = Math.floor(x / size);
    const row = Math.floor(y / size);
    let index = row * grid.cols + col;
    
    if (index < 0) index = 0;
    if (index >= dots.length) index = dots.length - 1;

    anime({
      targets: '.anime-dot',
      scale: [
        { value: 2.5, easing: 'easeOutSine', duration: 250 },
        { value: 1, easing: 'easeOutElastic(1, .6)', duration: 800 }
      ],
      translateY: [
        { value: -15, easing: 'easeOutSine', duration: 250 },
        { value: 0, easing: 'easeOutElastic(1, .6)', duration: 800 }
      ],
      opacity: [
        { value: 0.8, easing: 'easeOutSine', duration: 250 },
        { value: 0.15, easing: 'easeInOutQuad', duration: 800 }
      ],
      delay: anime.stagger(50, { grid: [grid.cols, grid.rows], from: index })
    });
  };

  // Add an initial automated ripple to draw attention
  useEffect(() => {
    if (grid.cols > 0 && grid.rows > 0) {
      setTimeout(() => {
        const centerIndex = Math.floor((grid.rows / 2)) * grid.cols + Math.floor(grid.cols / 2);
        anime({
          targets: '.anime-dot',
          scale: [
            { value: 2, easing: 'easeOutSine', duration: 250 },
            { value: 1, easing: 'easeOutElastic(1, .6)', duration: 800 }
          ],
          opacity: [
            { value: 0.5, easing: 'easeOutSine', duration: 250 },
            { value: 0.15, easing: 'easeInOutQuad', duration: 800 }
          ],
          delay: anime.stagger(50, { grid: [grid.cols, grid.rows], from: centerIndex })
        });
      }, 1000);
    }
  }, [grid.cols, grid.rows]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        placeItems: 'center',
        zIndex: 0, // Behind the text but over the background
        color: 'var(--link, rgba(128, 192, 255, 1))', // Adapt to active CSS variables without hardcoding colors
        cursor: 'crosshair',
        maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%)',
      }}
    >
      {dots.map((i) => (
        <div
          key={i}
          className="anime-dot"
          style={{
            width: '3px',
            height: '3px',
            backgroundColor: 'currentColor',
            opacity: 0.15,
            borderRadius: '50%',
            pointerEvents: 'none',
            boxShadow: '0 0 6px currentColor'
          }}
        />
      ))}
    </div>
  );
}
