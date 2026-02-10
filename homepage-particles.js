
/**
 * HOMEPAGE PARTICLES & HUD SYSTEM v2.0
 * Creates a dynamic constellation background and floating HUD elements.
 */

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let mouse = { x: null, y: null };

// CONFIG
const PARTICLE_COUNT = 80; // Optimized
const CONNECT_DISTANCE = 160;
const SPEED = 0.4;
const COLORS = ['#00f3ff', '#9333ea', '#ffd700', '#ff0055']; // Cyan, Purple, Gold, Pink

function initParticles() {
    // Canvas Setup
    canvas.id = 'bg-particles';
    canvas.style.position = 'fixed'; // FIXED so it covers scroll too
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '-1'; // Behind everything
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Mouse Interaction
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    window.addEventListener('mouseout', () => {
        mouse.x = null;
        mouse.y = null;
    });

    // Create Particles
    createParticles();
    animateParticles();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * SPEED;
        this.vy = (Math.random() - 0.5) * SPEED;
        this.sizeBase = Math.random() * 2 + 1; // Base size
        this.size = this.sizeBase;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.life = Math.random() * Math.PI * 2; // Random starting phase for blink
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life += 0.05; // Blink speed

        // PULSING SIZE (Kelap-Klip)
        this.size = this.sizeBase + Math.sin(this.life) * 0.5;

        // Bounce edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse Repel
        if (mouse.x != null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 120) {
                const force = (120 - distance) / 120;
                const angle = Math.atan2(dy, dx);
                this.x -= Math.cos(angle) * force * 2; // Stronger push
                this.y -= Math.sin(angle) * force * 2;
            }
        }
    }

    draw() {
        ctx.fillStyle = this.color;

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // Reset
    }
}

function createParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect Lines
        for (let j = i; j < particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONNECT_DISTANCE) {
                ctx.beginPath();
                // Alpha based on distance
                let opacity = 1 - (distance / CONNECT_DISTANCE);

                // Color mixing or just use white/cyan
                ctx.strokeStyle = `rgba(180, 200, 255, ${opacity * 0.15})`; // Subtle connecting lines
                ctx.lineWidth = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }

        // Connect to Mouse
        if (mouse.x != null) {
            let dx = particles[i].x - mouse.x;
            let dy = particles[i].y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < CONNECT_DISTANCE) {
                ctx.beginPath();
                let opacity = 1 - (distance / CONNECT_DISTANCE);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.4})`; // Brighter line to mouse
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animateParticles);
}

// === FLOATING HUD WIDGETS ===
function initHUD() {
    const hudContainer = document.createElement('div');
    hudContainer.className = 'hud-overlay-container';
    document.body.appendChild(hudContainer);

    // 1. Top Right Spinner (Visual Only, No Text)
    const spinner = document.createElement('div');
    spinner.className = 'hud-spinner-top-right';
    hudContainer.appendChild(spinner);

    // REMOVED: Data Stream & Float Card based on user feedback ("Ganggu")
}

// Run
window.addEventListener('load', () => {
    initParticles();
    initHUD();
});
