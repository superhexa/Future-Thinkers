import React, { useEffect, useRef, useState } from "react";

export function Counter({ value = 0, duration = 1400, className = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef();
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(eased * value));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);
  return <span ref={ref} className={className}>{n.toLocaleString("en-US")}</span>;
}
