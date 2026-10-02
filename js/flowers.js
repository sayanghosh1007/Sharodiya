// Shiuli Flower Particle Physics System
// Authentic autumn celebration atmospheric effect with gentle wind sway & rotation

const SHIULI_SVG = `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ff8c00" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- 5 Pure White Petals of Shiuli (Night Jasmine) -->
  <g filter="url(#softGlow)">
    <circle cx="50" cy="50" r="10" fill="#FFFFFF" />
    <circle cx="50" cy="38" r="13" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="62" cy="50" r="13" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="50" cy="62" r="13" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="38" cy="50" r="13" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="41" cy="41" r="11" fill="#FFFFFF" opacity="0.92"/>
    <circle cx="59" cy="41" r="11" fill="#FFFFFF" opacity="0.92"/>
    <circle cx="59" cy="59" r="11" fill="#FFFFFF" opacity="0.92"/>
    <circle cx="41" cy="59" r="11" fill="#FFFFFF" opacity="0.92"/>
    <!-- Iconic Orange/Saffron Tube Center (Bogula/Kunkuma) -->
    <circle cx="50" cy="50" r="5.5" fill="#FF7700" />
    <circle cx="50" cy="50" r="2.8" fill="#FF4500" />
  </g>
</svg>
`;

export class ShiuliParticleSystem {
  constructor(containerId = 'particle-container', count = 24) {
    this.container = document.getElementById(containerId);
    this.count = count;
    this.particles = [];
    this.isEnabled = true;
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    this.particles = [];

    for (let i = 0; i < this.count; i++) {
      this.createParticle(true);
    }
  }

  createParticle(initial = false) {
    if (!this.container || !this.isEnabled) return;

    const el = document.createElement('div');
    el.className = 'flower-particle absolute pointer-events-none select-none';
    el.innerHTML = SHIULI_SVG;

    const size = Math.floor(Math.random() * 22) + 16; // 16px to 38px
    const left = Math.random() * 100; // 0% to 100%
    const duration = (Math.random() * 8 + 8).toFixed(1); // 8s to 16s
    const delay = initial ? (Math.random() * 12).toFixed(1) : '0';
    const swayDist = `${(Math.random() * 140 - 70).toFixed(0)}px`;
    const rotDist = `${(Math.random() * 720 - 360).toFixed(0)}deg`;
    const opacity = (Math.random() * 0.4 + 0.6).toFixed(2);

    el.style.setProperty('--size', `${size}px`);
    el.style.setProperty('--left', `${left}%`);
    el.style.setProperty('--duration', `${duration}s`);
    el.style.setProperty('--delay', `${delay}s`);
    el.style.setProperty('--sway-dist', swayDist);
    el.style.setProperty('--rot-dist', rotDist);
    el.style.opacity = opacity;

    this.container.appendChild(el);

    // Reset loop
    el.addEventListener('animationiteration', () => {
      el.style.setProperty('--left', `${Math.random() * 100}%`);
      el.style.setProperty('--sway-dist', `${(Math.random() * 140 - 70).toFixed(0)}px`);
    });
  }

  toggle(enabled) {
    this.isEnabled = enabled !== undefined ? enabled : !this.isEnabled;
    if (this.container) {
      this.container.style.opacity = this.isEnabled ? '1' : '0';
      this.container.style.transition = 'opacity 0.4s ease';
    }
    return this.isEnabled;
  }
}
