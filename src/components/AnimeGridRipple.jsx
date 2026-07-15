import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

export default function AnimeGridRipple() {
  const containerRef = useRef(null);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [dots, setDots] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const activeAnims = useRef(0);

  const startAnim = () => {
    activeAnims.current++;
    setIsAnimating(true);
  };

  const endAnim = () => {
    activeAnims.current--;
    if (activeAnims.current <= 0) {
      activeAnims.current = 0;
      setIsAnimating(false);
    }
  };

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
    if (!containerRef.current || grid.cols === 0 || grid.rows === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const colWidth = rect.width / grid.cols;
    const rowHeight = rect.height / grid.rows;
    const col = Math.min(grid.cols - 1, Math.max(0, Math.floor(x / colWidth)));
    const row = Math.min(grid.rows - 1, Math.max(0, Math.floor(y / rowHeight)));
    const index = row * grid.cols + col;

    startAnim();
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
      delay: anime.stagger(50, { grid: [grid.cols, grid.rows], from: index }),
      complete: endAnim
    });
  };

  // Add initial and recurring automated ripples for background dynamism
  useEffect(() => {
    if (grid.cols === 0 || grid.rows === 0) return undefined;

    // Initial center wave
    const t = setTimeout(() => {
      const centerIndex = Math.floor((grid.rows / 2)) * grid.cols + Math.floor(grid.cols / 2);
      startAnim();
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
        delay: anime.stagger(50, { grid: [grid.cols, grid.rows], from: centerIndex }),
        complete: endAnim
      });
    }, 1000);

    // Recurring gentle corner/center sweeps every 12 seconds
    const interval = setInterval(() => {
      const corners = [
        0, // top-left
        grid.cols - 1, // top-right
        grid.cols * (grid.rows - 1), // bottom-left
        grid.cols * grid.rows - 1, // bottom-right
        Math.floor((grid.rows / 2)) * grid.cols + Math.floor(grid.cols / 2) // center
      ];
      const randomIndex = corners[Math.floor(Math.random() * corners.length)];

      startAnim();
      anime({
        targets: '.anime-dot',
        scale: [
          { value: 1.8, easing: 'easeOutSine', duration: 250 },
          { value: 1, easing: 'easeOutElastic(1, .6)', duration: 800 }
        ],
        opacity: [
          { value: 0.45, easing: 'easeOutSine', duration: 250 },
          { value: 0.15, easing: 'easeInOutQuad', duration: 800 }
        ],
        delay: anime.stagger(50, { grid: [grid.cols, grid.rows], from: randomIndex }),
        complete: endAnim
      });
    }, 12000);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [grid.cols, grid.rows]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      aria-hidden="true"
      className={`anime-grid-container ${isAnimating ? 'is-animating' : ''}`.trim()}
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
        zIndex: 0,
        color: 'var(--link, rgba(128, 192, 255, 1))',
        cursor: 'crosshair',
        maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0) 100%)',
        pointerEvents: 'auto',
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
            boxShadow: '0 0 6px currentColor',
            transition: 'transform 0.25s cubic-bezier(0.2, 1, 0.2, 1), opacity 0.25s, color 0.25s',
            pointerEvents: 'auto',
          }}
        />
      ))}
    </div>
  );
}
