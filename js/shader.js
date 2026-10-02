// Sharodiya Neo-Festal WebGL Ambient Shader Canvas
// Directly adapted from Stitch project 5323275838871929473

export function initFestiveShader(canvasId = 'shader-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  function syncSize() {
    const parent = canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = Math.min(w, 1920);
      canvas.height = Math.min(h, 1080);
    }
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas.parentElement || document.body);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    console.warn('WebGL not supported; falling back to CSS radial background gradient.');
    canvas.style.display = 'none';
    return;
  }

  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fs = `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

void main() {
    vec2 uv = v_texCoord;
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Smooth undulating pulse inspired by festive lamps (Pradeep) & cosmic energy
    for(float i = 1.0; i < 3.5; i++) {
        p.x += 0.25 / i * sin(i * 2.5 * p.y + u_time * 0.4);
        p.y += 0.25 / i * cos(i * 2.5 * p.x + u_time * 0.4);
    }
    
    // Colors derived from Sharodiya Neo-Festal palette (Sindoor Red, Festal Gold, Obsidian)
    vec3 colorSindoor = vec3(0.827, 0.063, 0.094); // #d31018 (Sindoor Red)
    vec3 colorGold    = vec3(1.0, 0.843, 0.0);     // #ffd700 (Festal Gold)
    vec3 colorNight   = vec3(0.075, 0.075, 0.075); // #131313 (Deep Obsidian)
    
    float glow = 0.4 / (length(p) + 0.05);
    vec3 finalColor = mix(colorNight, colorSindoor, sin(u_time * 0.15) * 0.5 + 0.5);
    finalColor += colorGold * glow * 0.12;
    
    // Subtle vignette & dark fade for high contrast readability
    float vignette = 1.0 - length(uv - 0.5) * 0.65;
    gl_FragColor = vec4(finalColor * vignette, 0.85);
}`;

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vShader = createShader(gl.VERTEX_SHADER, vs);
  const fShader = createShader(gl.FRAGMENT_SHADER, fs);
  if (!vShader || !fShader) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(prog));
    return;
  }

  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

  window.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  }, { passive: true });

  let animationFrameId;
  let isVisible = true;

  // Optimize when offscreen
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
  }, { threshold: 0.1 });
  observer.observe(canvas);

  function render(t) {
    if (isVisible) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(animationFrameId);
    observer.disconnect();
  };
}
