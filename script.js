// Enhanced Snake Game Implementation
class EnhancedSnakeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Set canvas size to match container
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.width = canvas.width;
    this.height = canvas.height;

    // Game settings
    this.gridSize = 20;
    this.tileCount = {
      x: Math.floor(this.width / this.gridSize),
      y: Math.floor(this.height / this.gridSize),
    };

    // Game state
    this.score = 0;
    this.gameRunning = true;
    this.level = 1;
    this.foodEaten = 0;

    // Snake properties - Mulai dengan ekor yang panjang
    this.snake = this.createInitialSnake();
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };

    // Smooth movement properties
    this.smoothX = 0;
    this.smoothY = 0;
    this.animationProgress = 0;

    // Food
    this.food = this.generateFood();
    this.specialFood = null;
    this.specialFoodTimer = 0;

    // Game speed - Lebih cepat untuk gerakan yang smooth
    this.moveTimer = 0;
    this.moveInterval = 12; // Lebih cepat dari sebelumnya
    this.baseSpeed = 12;

    // AI pathfinding
    this.pathfindingTimer = 0;
    this.pathfindingInterval = 6; // Lebih responsif

    // Visual effects
    this.particles = [];
    this.trailEffect = [];

    // Start game loop
    this.gameLoop();
  }

  // Buat snake dengan ekor yang sudah panjang dari awal
  createInitialSnake() {
    const initialLength = 8; // Mulai dengan 8 segmen
    const snake = [];
    const startX = Math.floor(this.tileCount.x / 4);
    const startY = Math.floor(this.tileCount.y / 2);

    for (let i = 0; i < initialLength; i++) {
      snake.push({
        x: startX - i,
        y: startY,
        // Tambah properties untuk smooth animation
        smoothX: (startX - i) * this.gridSize,
        smoothY: startY * this.gridSize,
      });
    }

    return snake;
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    if (this.gridSize) {
      this.tileCount = {
        x: Math.floor(this.width / this.gridSize),
        y: Math.floor(this.height / this.gridSize),
      };
    }
  }

  generateFood() {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount.x),
        y: Math.floor(Math.random() * this.tileCount.y),
        type: "normal",
        glow: 0,
      };
    } while (this.isSnakePosition(newFood.x, newFood.y));

    return newFood;
  }

  generateSpecialFood() {
    if (this.specialFood) return;

    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount.x),
        y: Math.floor(Math.random() * this.tileCount.y),
        type: "special",
        value: 50,
        glow: 0,
        pulse: 0,
      };
    } while (
      this.isSnakePosition(newFood.x, newFood.y) ||
      (newFood.x === this.food.x && newFood.y === this.food.y)
    );

    this.specialFood = newFood;
    this.specialFoodTimer = 300; // 5 detik pada 60fps
  }

  isSnakePosition(x, y) {
    return this.snake.some((segment) => segment.x === x && segment.y === y);
  }

  // Enhanced AI pathfinding dengan strategi yang lebih pintar
  findBestDirection() {
    const head = this.snake[0];
    const possibleDirections = [
      { x: 1, y: 0 }, // right
      { x: -1, y: 0 }, // left
      { x: 0, y: 1 }, // down
      { x: 0, y: -1 }, // up
    ];

    let bestDirection = this.direction;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const dir of possibleDirections) {
      // Don't reverse direction
      if (dir.x === -this.direction.x && dir.y === -this.direction.y) continue;

      const newHead = {
        x: head.x + dir.x,
        y: head.y + dir.y,
      };

      // Check if this direction is safe
      if (this.isValidPosition(newHead)) {
        const score = this.evaluatePosition(newHead, dir);
        if (score > bestScore) {
          bestScore = score;
          bestDirection = dir;
        }
      }
    }

    return bestDirection;
  }

  isValidPosition(pos) {
    // Check walls
    if (
      pos.x < 0 ||
      pos.x >= this.tileCount.x ||
      pos.y < 0 ||
      pos.y >= this.tileCount.y
    ) {
      return false;
    }

    // Check snake body (except tail which will move)
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === pos.x && this.snake[i].y === pos.y) {
        return false;
      }
    }

    return true;
  }

  evaluatePosition(pos, direction) {
    let score = 0;

    // Prioritas makanan khusus jika ada
    const targetFood = this.specialFood || this.food;

    // Distance to food (closer is better)
    const foodDistance =
      Math.abs(pos.x - targetFood.x) + Math.abs(pos.y - targetFood.y);
    score += (this.tileCount.x + this.tileCount.y - foodDistance) * 10;

    // Bonus untuk makanan khusus
    if (this.specialFood && targetFood === this.specialFood) {
      score += 100;
    }

    // Distance to walls (farther is better)
    const wallDistance = Math.min(
      pos.x,
      this.tileCount.x - 1 - pos.x,
      pos.y,
      this.tileCount.y - 1 - pos.y
    );
    score += wallDistance * 3;

    // Avoid getting trapped - lebih sophisticated
    const openSpaces = this.countOpenSpaces(pos);
    const futureSpace = this.analyzeFutureSpace(pos, direction, 3);
    score += openSpaces * 5 + futureSpace * 2;

    // Prefer continuing in same direction for smoother movement
    if (direction.x === this.direction.x && direction.y === this.direction.y) {
      score += 8;
    }

    // Avoid corners and dead ends
    if (this.isNearCorner(pos)) {
      score -= 20;
    }

    return score;
  }

  countOpenSpaces(pos) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    let openCount = 0;
    for (const dir of directions) {
      const checkPos = { x: pos.x + dir.x, y: pos.y + dir.y };
      if (this.isValidPosition(checkPos)) {
        openCount++;
      }
    }
    return openCount;
  }

  // Analisis ruang di masa depan untuk menghindari jebakan
  analyzeFutureSpace(pos, direction, depth) {
    if (depth === 0) return 0;

    const futurePos = { x: pos.x + direction.x, y: pos.y + direction.y };
    if (!this.isValidPosition(futurePos)) return -10;

    const openSpaces = this.countOpenSpaces(futurePos);
    return (
      openSpaces + this.analyzeFutureSpace(futurePos, direction, depth - 1)
    );
  }

  isNearCorner(pos) {
    const corners = [
      { x: 0, y: 0 },
      { x: this.tileCount.x - 1, y: 0 },
      { x: 0, y: this.tileCount.y - 1 },
      { x: this.tileCount.x - 1, y: this.tileCount.y - 1 },
    ];

    return corners.some(
      (corner) =>
        Math.abs(pos.x - corner.x) <= 2 && Math.abs(pos.y - corner.y) <= 2
    );
  }

  // Tambah partikel effect
  addParticle(x, y, color, type = "explosion") {
    const particleCount = type === "trail" ? 3 : 8;

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: x * this.gridSize + this.gridSize / 2,
        y: y * this.gridSize + this.gridSize / 2,
        vx: (Math.random() - 0.5) * (type === "trail" ? 2 : 6),
        vy: (Math.random() - 0.5) * (type === "trail" ? 2 : 6),
        life: type === "trail" ? 20 : 30,
        maxLife: type === "trail" ? 20 : 30,
        color: color,
        size: type === "trail" ? 2 : 4,
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      return particle.life > 0;
    });
  }

  drawParticles() {
    this.particles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    });
    this.ctx.globalAlpha = 1;
  }

  update() {
    // Generate special food occasionally
    if (Math.random() < 0.003 && !this.specialFood) {
      this.generateSpecialFood();
    }

    // Update special food timer
    if (this.specialFood) {
      this.specialFoodTimer--;
      this.specialFood.pulse += 0.2;
      if (this.specialFoodTimer <= 0) {
        this.specialFood = null;
      }
    }

    // AI pathfinding - lebih sering update
    this.pathfindingTimer++;
    if (this.pathfindingTimer >= this.pathfindingInterval) {
      this.nextDirection = this.findBestDirection();
      this.pathfindingTimer = 0;
    }

    // Smooth movement animation
    this.animationProgress += 0.15; // Kecepatan animasi

    // Move snake
    this.moveTimer++;
    if (this.moveTimer >= this.moveInterval) {
      this.direction = this.nextDirection;
      this.moveSnake();
      this.animationProgress = 0;
      this.moveTimer = 0;
    }

    // Update particles
    this.updateParticles();

    // Update food effects
    this.food.glow += 0.1;
    if (this.specialFood) {
      this.specialFood.glow += 0.15;
    }

    // Dynamic speed adjustment
    this.adjustGameSpeed();
  }

  moveSnake() {
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Initialize smooth position for new head
    head.smoothX = head.x * this.gridSize;
    head.smoothY = head.y * this.gridSize;

    // Check collision with walls or self
    if (!this.isValidPosition(head)) {
      this.resetGame();
      return;
    }

    // Add trail effect for head
    this.addParticle(this.snake[0].x, this.snake[0].y, "#00ff00", "trail");

    this.snake.unshift(head);

    // Check food collision
    let foodEaten = false;
    let scoreGain = 10;

    // Check normal food
    if (head.x === this.food.x && head.y === this.food.y) {
      foodEaten = true;
      this.addParticle(this.food.x, this.food.y, "#ff0000");
      this.food = this.generateFood();
      this.foodEaten++;
    }

    // Check special food
    if (
      this.specialFood &&
      head.x === this.specialFood.x &&
      head.y === this.specialFood.y
    ) {
      foodEaten = true;
      scoreGain = this.specialFood.value;
      this.addParticle(this.specialFood.x, this.specialFood.y, "#ffff00");
      this.specialFood = null;

      // Special food gives multiple segments
      for (let i = 0; i < 3; i++) {
        const tail = { ...this.snake[this.snake.length - 1] };
        tail.smoothX = tail.x * this.gridSize;
        tail.smoothY = tail.y * this.gridSize;
        this.snake.push(tail);
      }
    }

    if (foodEaten) {
      this.score += scoreGain;
      document.getElementById("score").textContent = this.score;

      // Level up setiap 5 makanan
      if (this.foodEaten % 5 === 0) {
        this.level++;
        this.moveInterval = Math.max(6, this.baseSpeed - this.level);
      }
    } else {
      this.snake.pop();
    }
  }

  adjustGameSpeed() {
    // Percepat game berdasarkan skor
    const speedBonus = Math.floor(this.score / 100);
    this.moveInterval = Math.max(6, this.baseSpeed - speedBonus);
  }

  resetGame() {
    // Efek ledakan saat game over
    const head = this.snake[0];
    for (let i = 0; i < 20; i++) {
      this.addParticle(head.x, head.y, "#ff0000");
    }

    // Reset dengan ekor panjang lagi
    this.snake = this.createInitialSnake();
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.food = this.generateFood();
    this.specialFood = null;
    this.level = 1;
    this.foodEaten = 0;
    this.moveInterval = this.baseSpeed;

    // Jangan reset score untuk progress kumulatif
    // this.score = 0;
  }

  draw() {
    // Clear canvas dengan efek fade
    this.ctx.fillStyle = "rgba(10, 10, 35, 0.15)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw enhanced grid
    this.drawGrid();

    // Draw food dengan efek yang lebih menarik
    this.drawFood();

    // Draw special food
    if (this.specialFood) {
      this.drawSpecialFood();
    }

    // Draw snake dengan animasi smooth
    this.drawSnake();

    // Draw particles
    this.drawParticles();

    // Draw UI
    this.drawUI();
  }

  drawGrid() {
    this.ctx.strokeStyle = "rgba(0, 255, 0, 0.08)";
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= this.tileCount.x; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.gridSize, 0);
      this.ctx.lineTo(x * this.gridSize, this.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.tileCount.y; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.gridSize);
      this.ctx.lineTo(this.width, y * this.gridSize);
      this.ctx.stroke();
    }
  }

  drawFood() {
    const glowIntensity = Math.sin(this.food.glow) * 0.5 + 0.5;

    // Glow effect
    this.ctx.shadowColor = "#ff0000";
    this.ctx.shadowBlur = 15 + glowIntensity * 10;

    // Main food
    this.ctx.fillStyle = `rgba(255, ${50 + glowIntensity * 50}, 0, 0.9)`;
    this.ctx.fillRect(
      this.food.x * this.gridSize + 3,
      this.food.y * this.gridSize + 3,
      this.gridSize - 6,
      this.gridSize - 6
    );

    // Inner core
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(
      this.food.x * this.gridSize + this.gridSize / 2 - 2,
      this.food.y * this.gridSize + this.gridSize / 2 - 2,
      4,
      4
    );

    this.ctx.shadowBlur = 0;
  }

  drawSpecialFood() {
    const pulseSize = Math.sin(this.specialFood.pulse) * 3;
    const glowIntensity = Math.sin(this.specialFood.glow) * 0.5 + 0.5;

    // Rainbow glow effect
    this.ctx.shadowColor = "#ffff00";
    this.ctx.shadowBlur = 20 + glowIntensity * 15;

    // Pulsing special food
    this.ctx.fillStyle = `rgba(255, 255, 0, 0.95)`;
    this.ctx.fillRect(
      this.specialFood.x * this.gridSize + 2 - pulseSize,
      this.specialFood.y * this.gridSize + 2 - pulseSize,
      this.gridSize - 4 + pulseSize * 2,
      this.gridSize - 4 + pulseSize * 2
    );

    // Diamond shape
    this.ctx.fillStyle = "#ffffff";
    const centerX = this.specialFood.x * this.gridSize + this.gridSize / 2;
    const centerY = this.specialFood.y * this.gridSize + this.gridSize / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - 4);
    this.ctx.lineTo(centerX + 4, centerY);
    this.ctx.lineTo(centerX, centerY + 4);
    this.ctx.lineTo(centerX - 4, centerY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  drawSnake() {
    this.snake.forEach((segment, index) => {
      // Calculate smooth position dengan interpolasi
      const targetX = segment.x * this.gridSize;
      const targetY = segment.y * this.gridSize;

      if (!segment.smoothX) segment.smoothX = targetX;
      if (!segment.smoothY) segment.smoothY = targetY;

      // Smooth interpolation
      const lerpFactor = 0.3;
      segment.smoothX += (targetX - segment.smoothX) * lerpFactor;
      segment.smoothY += (targetY - segment.smoothY) * lerpFactor;

      if (index === 0) {
        // Head dengan efek khusus
        this.ctx.fillStyle = "rgba(0, 255, 0, 0.95)";
        this.ctx.shadowColor = "#00ff00";
        this.ctx.shadowBlur = 15;

        // Head shape
        this.ctx.fillRect(
          segment.smoothX + 2,
          segment.smoothY + 2,
          this.gridSize - 4,
          this.gridSize - 4
        );

        // Eyes
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(segment.smoothX + 6, segment.smoothY + 6, 3, 3);
        this.ctx.fillRect(
          segment.smoothX + this.gridSize - 9,
          segment.smoothY + 6,
          3,
          3
        );
      } else {
        // Body dengan gradient fade
        const alpha = Math.max(0.4, 1 - index * 0.05);
        const greenIntensity = Math.max(100, 255 - index * 10);

        this.ctx.fillStyle = `rgba(0, ${greenIntensity}, 0, ${alpha})`;
        this.ctx.shadowColor = `rgba(0, ${greenIntensity}, 0, 0.5)`;
        this.ctx.shadowBlur = 8;

        // Body segments dengan rounded corners
        this.ctx.fillRect(
          segment.smoothX + 1,
          segment.smoothY + 1,
          this.gridSize - 2,
          this.gridSize - 2
        );

        // Highlight untuk efek 3D
        if (index < 5) {
          this.ctx.fillStyle = `rgba(100, 255, 100, ${alpha * 0.3})`;
          this.ctx.fillRect(
            segment.smoothX + 3,
            segment.smoothY + 3,
            this.gridSize - 6,
            2
          );
        }
      }
    });

    this.ctx.shadowBlur = 0;
  }

  drawUI() {
    // Level indicator
    this.ctx.fillStyle = "#ffff00";
    this.ctx.font = "12px 'Press Start 2P'";
    this.ctx.fillText(`LEVEL: ${this.level}`, 20, 30);

    // Length indicator
    this.ctx.fillText(`LENGTH: ${this.snake.length}`, 20, 50);

    // Special food timer
    if (this.specialFood) {
      this.ctx.fillStyle = "#ff8800";
      this.ctx.fillText(
        `BONUS: ${Math.ceil(this.specialFoodTimer / 60)}s`,
        20,
        70
      );
    }
  }

  gameLoop() {
    if (this.gameRunning) {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.gameLoop());
    }
  }
}

// Enhanced Navigation dan interaksi
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Enhanced Snake game
  const canvas = document.getElementById("snakeGame");
  if (canvas) {
    new EnhancedSnakeGame(canvas);
  }

  // Semua fungsi navigasi dan interaksi lainnya tetap sama
  // ... (copy semua kode navigasi dari script asli)

  // Smooth scrolling for navigation
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");

      const targetId = this.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Animate skill bars
  const observerOptions = {
    threshold: 0.5,
    rootMargin: "0px 0px -100px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const skillBars = entry.target.querySelectorAll(".skill-progress");
        skillBars.forEach((bar) => {
          const width = bar.getAttribute("data-width");
          setTimeout(() => {
            bar.style.width = width + "%";
          }, 200);
        });
      }
    });
  }, observerOptions);

  const skillsSection = document.getElementById("skills");
  if (skillsSection) {
    observer.observe(skillsSection);
  }

  // Form submission
  const form = document.querySelector(".pixel-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = form.querySelectorAll("input, textarea");
      let isValid = true;

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          isValid = false;
          input.style.borderColor = "#ff0000";
        } else {
          input.style.borderColor = "#00ff00";
        }
      });

      if (isValid) {
        alert("PESAN TERKIRIM! TERIMA KASIH TELAH MENGHUBUNGI SAYA.");
        form.reset();
        inputs.forEach((input) => {
          input.style.borderColor = "#333";
        });
      } else {
        alert("MOHON ISI SEMUA FIELD YANG DIPERLUKAN!");
      }
    });
  }

  // Navigation scroll effect
  window.addEventListener("scroll", () => {
    const sections = document.querySelectorAll("section[id]");
    const scrollPos = window.scrollY + 100;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute("id");

      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach((link) => {
          link.classList.remove("active");
          if (link.getAttribute("href") === "#" + sectionId) {
            link.classList.add("active");
          }
        });
      }
    });
  });

  // Typing effect untuk hero title
  const heroTitle = document.querySelector(".hero-title");
  if (heroTitle) {
    const text = heroTitle.textContent;
    heroTitle.textContent = "";
    let i = 0;

    function typeWriter() {
      if (i < text.length) {
        heroTitle.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 100);
      }
    }

    setTimeout(typeWriter, 1000);
  }

  // Project cards hover effects
  const projectCards = document.querySelectorAll(".project-card");
  projectCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-10px) scale(1.02)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) scale(1)";
    });
  });
});

// Console Easter Eggs - Enhanced
console.log(`
    ███████╗███╗   ██╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗███████╗██████╗ 
    ██╔════╝████╗  ██║██║  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝██╔══██╗
    █████╗  ██╔██╗ ██║███████║███████║██╔██╗ ██║██║     █████╗  ██║  ██║
    ██╔══╝  ██║╚██╗██║██╔══██║██╔══██║██║╚██╗██║██║     ██╔══╝  ██║  ██║
    ███████╗██║ ╚████║██║  ██║██║  ██║██║ ╚████║╚██████╗███████╗██████╔╝
    ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═════╝ 
    
    🐍 ENHANCED SNAKE GAME LOADED! 🐍
    Features: Smooth Movement, Long Tail, Smart AI, Special Foods!
    Ketik 'snakehelp()' untuk melihat fitur-fitur baru!
  `);

window.snakehelp = () => {
  console.log(`
    🎮 ENHANCED SNAKE FEATURES:
    - ✨ Smooth interpolated movement
    - 🐍 Starts with long tail (8 segments)
    - 🧠 Advanced AI pathfinding
    - ⭐ Special golden food (50 points + 3 segments)
    - 💫 Particle effects dan visual enhancements
    - 📈 Dynamic speed adjustment
    - 🎯 Level system setiap 5 makanan
    - 🌟 Trail effects dan glow animations
    `);
};

// Tambahan console commands
window.gameinfo = () => {
  console.log(`
    📊 ENHANCED SNAKE STATS:
    - Grid Size: Adaptive
    - Initial Length: 8 segments
    - Speed: Dynamic (6-12ms)
    - AI Update Rate: 6ms
    - Particle System: Active
    - Special Food Chance: 0.3%
    `);
};
