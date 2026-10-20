/**
 * Visualizer - Holographic Arc Reactor Canvas Particle & Waveform Renderer
 */
class JarvisVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.state = 'idle'; // 'idle' | 'listening' | 'processing' | 'speaking'
    this.time = 0;
    this.audioIntensity = 0;

    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.particles = [];
    this.initParticles(32);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 105 + Math.random() * 25;
      this.particles.push({
        angle,
        radius,
        baseRadius: radius,
        speed: 0.005 + Math.random() * 0.01,
        size: 1.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7
      });
    }
  }

  setState(newState) {
    this.state = newState;
  }

  animate() {
    this.time += 0.03;
    this.ctx.clearRect(0, 0, this.width, this.height);

    switch (this.state) {
      case 'listening':
        this.renderListening();
        break;
      case 'speaking':
        this.renderSpeaking();
        break;
      case 'processing':
        this.renderProcessing();
        break;
      case 'idle':
      default:
        this.renderIdle();
        break;
    }

    requestAnimationFrame(this.animate);
  }

  // IDLE: Soft pulsing cyan rings and drifting particles
  renderIdle() {
    const pulse = Math.sin(this.time * 2) * 4;
    const baseRadius = 118;

    // Outer subtle boundary ring
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, baseRadius + pulse, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 8]);
    this.ctx.stroke();
    this.ctx.restore();

    // Floating orbit particles
    this.particles.forEach(p => {
      p.angle += p.speed;
      const x = this.centerX + Math.cos(p.angle) * p.radius;
      const y = this.centerY + Math.sin(p.angle) * p.radius;

      this.ctx.beginPath();
      this.ctx.arc(x, y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(0, 240, 255, ${p.opacity * 0.7})`;
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.shadowBlur = 6;
      this.ctx.fill();
    });
  }

  // LISTENING: Energetic green/cyan reactive radial wave bars
  renderListening() {
    const bars = 48;
    const innerR = 100;

    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2 + this.time * 0.5;
      const freq = Math.sin(this.time * 8 + i * 0.5) * 0.5 + 0.5;
      const barHeight = 8 + freq * 26;

      const x1 = this.centerX + Math.cos(angle) * innerR;
      const y1 = this.centerY + Math.sin(angle) * innerR;
      const x2 = this.centerX + Math.cos(angle) * (innerR + barHeight);
      const y2 = this.centerY + Math.sin(angle) * (innerR + barHeight);

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.strokeStyle = `rgba(0, 255, 170, ${0.4 + freq * 0.6})`;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#00ffaa';
      this.ctx.shadowBlur = 8;
      this.ctx.stroke();
    }
  }

  // SPEAKING: Stark gold & cyan acoustic sound waves oscillating around the core
  renderSpeaking() {
    const waves = 3;
    const baseR = 105;

    for (let w = 0; w < waves; w++) {
      this.ctx.beginPath();
      const points = 60;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const offset = Math.sin(angle * (5 + w * 2) + this.time * (6 + w * 2)) * (12 + w * 8);
        const r = baseR + offset + w * 10;
        const x = this.centerX + Math.cos(angle) * r;
        const y = this.centerY + Math.sin(angle) * r;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();
      const strokeCol = w === 1 ? 'rgba(255, 183, 3, 0.7)' : 'rgba(0, 240, 255, 0.6)';
      this.ctx.strokeStyle = strokeCol;
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = w === 1 ? '#ffb703' : '#00f0ff';
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
    }
  }

  // PROCESSING: Rotating concentric gear patterns
  renderProcessing() {
    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.time * 3);

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 115;
      const y = Math.sin(angle) * 115;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#0088ff';
      this.ctx.shadowColor = '#0088ff';
      this.ctx.shadowBlur = 12;
      this.ctx.fill();
    }
    this.ctx.restore();
  }
}

window.AryaVisualizer = JarvisVisualizer;
window.JarvisVisualizer = JarvisVisualizer;
