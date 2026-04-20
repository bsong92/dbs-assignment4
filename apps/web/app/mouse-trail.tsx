"use client";

import { useEffect } from "react";

export default function MouseTrail() {
  useEffect(() => {
    let lastTime = 0;
    const interval = 30; // Create trail every 30ms

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < interval) return;
      lastTime = now;

      // Create trail element
      const trail = document.createElement("div");
      trail.className = "mouse-trail";
      trail.style.left = e.clientX - 5 + "px";
      trail.style.top = e.clientY - 5 + "px";
      trail.style.width = "10px";
      trail.style.height = "10px";
      trail.style.background = `rgba(251, 146, 60, ${Math.random() * 0.5 + 0.3})`;

      document.body.appendChild(trail);

      // Remove element after animation
      setTimeout(() => trail.remove(), 800);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return null;
}
