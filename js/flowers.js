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

const STITCH_FLOWER_URL = 'https://lh3.googleusercontent.com/aida/AEtjO1W5qy_9hgI5-QZRK-MCFnwGVYg5WwZ3I-_7q2s_prdqGb60If1Eaiqko9eTrL9dkAbjs6jp4J62YqXkfSaAgGFerndIS6lL9txfrcmgT9rlWqH1LxHu8PrCX-GtmhCmUtgzc2XO4HqRUOxOCFAHY2RQ2T_9ZEBPeRMlXBwfiLb7x9l5lUMK47_cwTOdqyow2RiAZ9kDhYZI9N3Ra3ejM1gyD_XKIdgNdSXC8FHmRbn1Y2HxsDDMZKk6DHw';

export class ShiuliParticleSystem {
  constructor(containerId = 'particle-container', count = 28) {
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

    const img = document.createElement('img');
    img.className = 'flower-particle absolute pointer-events-none select-none object-contain';
    img.src = STITCH_FLOWER_URL;
    img.alt = 'Shiuli';
    img.onerror = () => {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = img.className;
      fallbackDiv.innerHTML = SHIULI_SVG;
      fallbackDiv.style.cssText = img.style.cssText;
      if (img.parentNode) img.parentNode.replaceChild(fallbackDiv, img);
    };

    const size = Math.floor(Math.random() * 20) + 16; // 16px to 36px
    const left = Math.random() * 100; // 0% to 100%
    const duration = (Math.random() * 7 + 7).toFixed(1); // 7s to 14s
    const delay = initial ? (Math.random() * 10).toFixed(1) : '0';
    const swayDist = `${(Math.random() * 160 - 80).toFixed(0)}px`;
    const rotDist = `${(Math.random() * 720 - 360).toFixed(0)}deg`;
    const opacity = (Math.random() * 0.35 + 0.65).toFixed(2);

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
