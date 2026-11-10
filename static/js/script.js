/**
 * KI CLASH 32-BIT - FighterZ Engine (Asignación de Mapeo Directo Z, X, C, V, B, N, M)
 */

const GAME_STATE = {
    MENU: 'MENU',
    CHAR_SELECT: 'CHAR_SELECT',
    FIGHT: 'FIGHT',
    PAUSED: 'PAUSED',
    KO: 'KO'
};

let currentGameState = GAME_STATE.MENU;
let gameMode = 'arcade';
let debugHitboxes = false;
let selectedCharP1 = 'kaito';
let globalMaxCombo = 0;

// === PRECARGA DE SPRITES SIN FONDO ===
const SPRITES = {};
const SPRITE_PATHS = {
    idle: 'static/images/1-removebg-preview.png',
    attack1: 'static/images/1-removebg-preview.png',
    attack2: 'static/images/2-removebg-preview.png',
    attack3: 'static/images/3-removebg-preview.png',
    attack4: 'static/images/4-removebg-preview.png',
    attack5: 'static/images/5-removebg-preview.png',
    attack6: 'static/images/6-removebg-preview.png',
    block: 'static/images/bloqueo-removebg-preview.png',
    hit: 'static/images/caida-removebg-preview.png',
    charging: 'static/images/cargar_energia-removebg-preview.png',
    counter: 'static/images/counter-removebg-preview.png',
    super13: 'static/images/nivel_1_y_3-removebg-preview.png',
    super7: 'static/images/nivel_7-removebg-preview.png',
    jump: 'static/images/salto-removebg-preview.png',
    stun: 'static/images/stun-removebg-preview.png'
};

function preloadSprites() {
    for (let key in SPRITE_PATHS) {
        const img = new Image();
        img.src = SPRITE_PATHS[key];
        SPRITES[key] = img;
    }
}
preloadSprites();

// Sintetizador de Sonido
class SoundEngine {
    constructor() { this.ctx = null; }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playPunch(type = 'jab') {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type === 'flurry' ? 'sawtooth' : 'triangle';
        const startFreq = type === 'flurry' ? 280 : (type === 'heavy_kick' ? 170 : 150);
        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
    }

    playKiBlast(heavy = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = heavy ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(heavy ? 350 : 650, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(heavy ? 1800 : 1400, this.ctx.currentTime + (heavy ? 0.4 : 0.2));
        gain.gain.setValueAtTime(heavy ? 0.55 : 0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (heavy ? 0.4 : 0.2));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + (heavy ? 0.4 : 0.2));
    }

    playSuperFlash() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    playCounter() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1400, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playShieldBreak() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
}

const sounds = new SoundEngine();

// Sistema de Partículas & Screen Shake
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.groundCracks = [];
    }

    spawn(x, y, vx, vy, color, radius, life) {
        this.particles.push({ x, y, vx, vy, color, radius, life, maxLife: life });
    }

    addGroundCrack(x, y) {
        if (this.groundCracks.length > 20) this.groundCracks.shift();
        this.groundCracks.push({ x, y, size: Math.random() * 22 + 15, life: 120 });
    }

    createImpactSparks(x, y, color = '#ffd700', count = 18) {
        triggerScreenShake();
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 4;
            this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, Math.random() * 5 + 2, 24);
        }
    }

    createAura(x, y, color) {
        for (let i = 0; i < 4; i++) {
            this.spawn(
                x + (Math.random() - 0.5) * 80,
                y + (Math.random() - 0.5) * 120,
                (Math.random() - 0.5) * 5,
                -Math.random() * 10 - 5,
                color,
                Math.random() * 10 + 4,
                26
            );
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.groundCracks.length - 1; i >= 0; i--) {
            const c = this.groundCracks[i];
            c.life--;
            if (c.life <= 0) this.groundCracks.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = '#1a0500';
        ctx.lineWidth = 3;
        for (const c of this.groundCracks) {
            ctx.beginPath();
            ctx.moveTo(c.x - c.size, c.y);
            ctx.lineTo(c.x + c.size, c.y);
            ctx.moveTo(c.x, c.y - c.size * 0.4);
            ctx.lineTo(c.x, c.y + c.size * 0.4);
            ctx.stroke();
        }

        for (const p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

const particles = new ParticleSystem();

function triggerScreenShake() {
    const el = document.getElementById('game-container');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
}

// Proyectiles Ki Blast
class Projectile {
    constructor(x, y, vx, vy, damage, color, owner, size = 18, type = 'ball', isSuper = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;
        this.owner = owner;
        this.radius = size;
        this.type = type;
        this.isSuper = isSuper;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -100 || this.x > 1380) this.active = false;
        particles.spawn(this.x, this.y, -this.vx * 0.15, (Math.random() - 0.5) * 3, this.color, 4, 12);
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 24;

        if (this.type === 'beam') {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.radius * 2.5, this.radius, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'blade') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.6, -Math.PI / 2, Math.PI / 2, false);
            ctx.fill();
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
}

let projectiles = [];

// Movesets por Personaje
const CHARACTER_MOVESETS = {
    kaito: {
        name: 'GOKU (SSJ)',
        auraColor: '#ffd700',
        jab: { reach: 110, damage: 40, cooldown: 14, sprite: 'attack1' },
        flurry: { reach: 125, damage: 30, cooldown: 30, sprite: 'attack2' },
        heavy_kick: { reach: 135, damage: 88, cooldown: 40, sprite: 'attack3' },
        ki_light: { damage: 70, cost: 100, cooldown: 22, color: '#00ffff', size: 20, type: 'ball', sprite: 'attack4' },
        ki_heavy: { damage: 210, cost: 300, cooldown: 55, color: '#00ffff', size: 45, type: 'beam', sprite: 'attack5' },
        ki_surge: { damage: 120, cost: 150, cooldown: 35, color: '#ff007f', size: 28, type: 'ball', sprite: 'attack6' }
    },
    ryuko: {
        name: 'TIEN SHINHAN',
        auraColor: '#00ffff',
        jab: { reach: 100, damage: 46, cooldown: 16, sprite: 'attack1' },
        flurry: { reach: 118, damage: 35, cooldown: 34, sprite: 'attack2' },
        heavy_kick: { reach: 128, damage: 96, cooldown: 45, sprite: 'attack3' },
        ki_light: { damage: 80, cost: 100, cooldown: 20, color: '#ffd700', size: 22, type: 'ball', sprite: 'attack4' },
        ki_heavy: { damage: 230, cost: 300, cooldown: 60, color: '#ffd700', size: 42, type: 'beam', sprite: 'attack5' },
        ki_surge: { damage: 120, cost: 150, cooldown: 35, color: '#ff007f', size: 28, type: 'ball', sprite: 'attack6' }
    },
    mizu: {
        name: 'TRUNKS',
        auraColor: '#00ffff',
        jab: { reach: 120, damage: 44, cooldown: 15, sprite: 'attack1' },
        flurry: { reach: 134, damage: 33, cooldown: 28, sprite: 'attack2' },
        heavy_kick: { reach: 140, damage: 80, cooldown: 38, sprite: 'attack3' },
        ki_light: { damage: 68, cost: 100, cooldown: 18, color: '#00ffff', size: 24, type: 'blade', sprite: 'attack4' },
        ki_heavy: { damage: 200, cost: 300, cooldown: 50, color: '#9d00ff', size: 45, type: 'beam', sprite: 'attack5' },
        ki_surge: { damage: 120, cost: 150, cooldown: 35, color: '#ff007f', size: 28, type: 'ball', sprite: 'attack6' }
    }
};

// Clase Fighter
class Fighter {
    constructor(id, charKey, x, isAI = false) {
        this.id = id;
        this.charKey = charKey || 'kaito';
        this.config = CHARACTER_MOVESETS[this.charKey];
        this.name = this.config.name;

        this.x = x;
        this.y = 520;
        this.vx = 0;
        this.vy = 0;
        
        this.width = 240;
        this.height = 260;
        
        this.facing = id === 1 ? 1 : -1;
        this.isAI = isAI;

        this.maxHp = 1000;
        this.hp = 1000;
        this.ki = 100;
        this.isTransformed = true;

        this.maxShieldEnergy = 360;
        this.shieldEnergy = 360;
        this.lastBlockReleaseTime = 0;
        this.wasBlocking = false;
        this.isGuardBroken = false;
        this.guardBreakTimer = 0;

        this.dashCharges = 3;
        this.dashCooldowns = [0, 0, 0];
        this.invincibleFrames = 0;

        this.counterStanceTimer = 0;
        this.counterStunTimer = 0;

        this.moveCooldowns = { jab: 0, flurry: 0, heavy_kick: 0, ki_light: 0, ki_heavy: 0, ki_surge: 0, super: 0 };

        this.lastAttackUsed = null;
        this.sameMoveCount = 0;
        this.comboCount = 0;
        this.comboTimer = 0;

        this.state = 'IDLE';
        this.attackType = 'jab';
        this.currentSuperLevel = 0;
        this.stateFrame = 0;
        this.hitstunFrames = 0;
        this.canCancel = false;
        this.hasHitTarget = false;

        this.isGrounded = true;
        this.isBlocking = false;
        this.isFloating = false;

        this.hurtbox = { x: 0, y: 0, w: 100, h: 220 };
        this.hitbox = null;
        this.animTimer = Math.random() * 100;
    }

    getComboScaling() {
        if (this.comboCount >= 30) return 0.25;
        if (this.comboCount >= 20) return 0.50;
        if (this.comboCount >= 10) return 0.75;
        return 1.0;
    }

    update(dt, opponent) {
        this.animTimer += 0.15;

        for (let move in this.moveCooldowns) {
            if (this.moveCooldowns[move] > 0) this.moveCooldowns[move]--;
        }

        for (let i = 0; i < 3; i++) {
            if (this.dashCooldowns[i] > 0) {
                this.dashCooldowns[i]--;
                if (this.dashCooldowns[i] <= 0 && this.dashCharges < 3) this.dashCharges++;
            }
        }

        if (this.invincibleFrames > 0) this.invincibleFrames--;

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) {
                this.comboCount = 0;
                this.sameMoveCount = 0;
                this.lastAttackUsed = null;
            }
        }

        if (this.state === 'COUNTER') {
            this.counterStanceTimer--;
            particles.createImpactSparks(this.x, this.y - 100, '#00ffff', 1);
            if (this.counterStanceTimer <= 0) {
                this.state = 'STUNNED';
                this.counterStunTimer = 60;
                particles.createImpactSparks(this.x, this.y - 100, '#ff0055', 18);
            }
        } else if (this.state === 'STUNNED') {
            this.counterStunTimer--;
            if (this.counterStunTimer <= 0) this.state = 'IDLE';
        }

        if (this.state === 'CHARGING') {
            this.vx = 0;
            this.vy = 0;
            this.isBlocking = false;
            this.addKi(3.2);
            particles.createAura(this.x, this.y - 60, this.config.auraColor);
            if (Math.random() < 0.2) particles.addGroundCrack(this.x, 520);
        }

        if (this.isGuardBroken) {
            this.guardBreakTimer--;
            this.state = 'HIT';
            this.isBlocking = false;
            this.isFloating = false;
            this.vx *= 0.85;

            if (this.guardBreakTimer <= 0) {
                this.isGuardBroken = false;
                this.shieldEnergy = 180;
                this.state = 'IDLE';
            }
        } else if (this.isBlocking) {
            if (!this.wasBlocking) {
                const now = Date.now();
                if (now - this.lastBlockReleaseTime < 1500) this.shieldEnergy = Math.floor(this.shieldEnergy / 2);
                this.wasBlocking = true;
            }
            this.shieldEnergy -= 1;
            if (this.shieldEnergy <= 0) {
                this.shieldEnergy = 0;
                this.isGuardBroken = true;
                this.guardBreakTimer = 110;
                this.isBlocking = false;
                this.state = 'HIT';
                sounds.playShieldBreak();
                particles.createImpactSparks(this.x, this.y - 100, '#ff0000', 30);
            }
        } else {
            if (this.wasBlocking) {
                this.lastBlockReleaseTime = Date.now();
                this.wasBlocking = false;
            }
            if (this.shieldEnergy < this.maxShieldEnergy) this.shieldEnergy += 0.8;
        }

        if (this.hitstunFrames > 0 && !this.isGuardBroken) {
            this.hitstunFrames--;
            this.state = 'HIT';
            this.isBlocking = false;
            this.isFloating = false;
            this.vx *= 0.85;
        } else if (this.state === 'HIT' && !this.isGuardBroken && this.counterStunTimer <= 0) {
            this.state = 'IDLE';
        }

        if (!this.isGrounded) {
            if (this.isFloating && this.ki > 0 && this.state !== 'HIT' && this.state !== 'CHARGING') {
                this.vy = Math.max(-3, this.vy - 0.4);
                this.ki = Math.max(0, this.ki - 0.6);
                particles.spawn(this.x, this.y + 10, 0, 3, this.config.auraColor, 4, 8);
            } else {
                this.vy += 0.8;
            }
        }

        if (this.isGrounded && this.state !== 'HIT') this.vx *= 0.75;

        this.x += this.vx;
        this.y += this.vy;

        if (this.y < 150) { this.y = 150; this.vy = Math.max(0, this.vy); }

        if (this.y >= 520) {
            this.y = 520;
            this.vy = 0;
            this.isGrounded = true;
            this.isFloating = false;
            if (this.state === 'JUMP') this.state = 'IDLE';
        } else {
            this.isGrounded = false;
        }

        this.x = Math.max(60, Math.min(1220, this.x));

        if (this.state === 'IDLE' || this.state === 'WALK') {
            this.facing = opponent.x > this.x ? 1 : -1;
        }

        this.hurtbox.x = this.x - 50;
        this.hurtbox.y = this.y - 220;

        if (this.state === 'ATTACK') {
            this.stateFrame++;
            const maxFrames = this.attackType === 'flurry' ? 24 : (this.attackType === 'heavy_kick' ? 20 : 16);
            if (this.stateFrame > 3 && this.stateFrame < maxFrames - 2 && this.hasHitTarget) this.canCancel = true;

            if (this.stateFrame >= maxFrames) {
                this.state = 'IDLE';
                this.hitbox = null;
                this.canCancel = false;
                this.hasHitTarget = false;
                this.currentSuperLevel = 0;
            }
        }

        if (this.isAI && currentGameState === GAME_STATE.FIGHT) this.updateAI(opponent);
    }

    executeSuper(level, opponent) {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'STUNNED' || this.state === 'CHARGING') return;
        
        const cost = level * 100;
        if (this.ki < cost) return;

        this.ki -= cost;
        this.currentSuperLevel = level;
        sounds.playSuperFlash();
        particles.createAura(this.x, this.y - 60, '#ff007f');

        if (level === 1) {
            this.state = 'ATTACK';
            this.attackType = 'super13';
            this.stateFrame = 0;
            const finalDamage = 260 * this.getComboScaling();

            projectiles.push(new Projectile(
                this.x + this.facing * 80,
                this.y - 120,
                this.facing * 16,
                0,
                finalDamage,
                '#ff007f',
                this,
                32,
                'ball',
                true
            ));
        } else if (level === 3) {
            this.state = 'ATTACK';
            this.attackType = 'super13';
            this.stateFrame = 0;
            const finalDamage = 500 * this.getComboScaling();

            projectiles.push(new Projectile(
                this.x + this.facing * 90,
                this.y - 120,
                this.facing * 20,
                0,
                finalDamage,
                '#ffd700',
                this,
                55,
                'beam',
                true
            ));
        } else if (level === 7) {
            this.state = 'ATTACK';
            this.attackType = 'super7';
            this.stateFrame = 0;

            const dist = Math.abs(opponent.x - this.x);
            if (dist <= 140) {
                particles.createImpactSparks(opponent.x, opponent.y - 100, '#ff0000', 50);
                opponent.takeDamage(1000, this, 'one_shot');
            } else {
                this.state = 'STUNNED';
                this.counterStunTimer = 180;
                particles.createImpactSparks(this.x, this.y - 100, '#ff0055', 30);
            }
        }
    }

    dash(dir) {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'CHARGING' || this.dashCharges <= 0) return;
        this.dashCharges--;
        this.invincibleFrames = 12;

        for (let i = 0; i < 3; i++) {
            if (this.dashCooldowns[i] <= 0) { this.dashCooldowns[i] = 480; break; }
        }

        const direction = dir || this.facing;
        this.vx = direction * 22;
        particles.createImpactSparks(this.x, this.y - 80, this.config.auraColor, 14);
    }

    attack(type) {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'STUNNED' || this.state === 'COUNTER' || this.state === 'CHARGING') return;
        if (this.moveCooldowns[type] > 0) return;
        if (this.state === 'ATTACK' && !this.canCancel) return;

        const moveData = this.config[type];
        this.state = 'ATTACK';
        this.attackType = type;
        this.stateFrame = 0;
        this.canCancel = false;
        this.hasHitTarget = false;

        this.moveCooldowns[type] = moveData.cooldown;
        sounds.playPunch(type);

        this.hitbox = {
            x: this.facing === 1 ? this.x : this.x - moveData.reach,
            y: this.y - 140,
            w: moveData.reach,
            h: 60,
            damage: moveData.damage,
            type: type
        };

        this.addKi(22);
    }

    shootKiBlast(isHeavy = false) {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'STUNNED' || this.state === 'CHARGING') return;
        const moveKey = isHeavy ? 'ki_heavy' : 'ki_light';
        const moveData = this.config[moveKey];

        if (this.moveCooldowns[moveKey] > 0) return;
        if (this.ki < moveData.cost) return;

        this.ki -= moveData.cost;
        this.moveCooldowns[moveKey] = moveData.cooldown;
        this.state = 'ATTACK';
        this.attackType = moveKey;
        sounds.playKiBlast(isHeavy);

        projectiles.push(new Projectile(
            this.x + this.facing * (isHeavy ? 80 : 65),
            this.y - 120,
            this.facing * (isHeavy ? 18 : 14),
            0,
            moveData.damage,
            moveData.color,
            this,
            moveData.size,
            moveData.type
        ));
    }

    startCounter() {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'STUNNED' || this.state === 'ATTACK' || this.state === 'CHARGING') return;
        this.state = 'COUNTER';
        this.counterStanceTimer = 30;
        sounds.playCounter();
    }

    takeDamage(amount, attacker, hitType) {
        if (this.invincibleFrames > 0) return;

        if (this.state === 'COUNTER' && hitType !== 'one_shot') {
            this.state = 'ATTACK';
            this.attackType = 'flurry';
            this.counterStanceTimer = 0;
            sounds.playCounter();
            particles.createImpactSparks(this.x, this.y - 100, '#ffd700', 30);
            attacker.takeDamage(140, this, 'heavy_kick');
            return;
        }

        if (this.isBlocking && !this.isGuardBroken && hitType !== 'one_shot') {
            amount *= 0.2;
            this.shieldEnergy = Math.max(0, this.shieldEnergy - (this.maxShieldEnergy * 0.25));
            particles.createImpactSparks(this.x, this.y - 100, '#00ffff', 14);

            if (this.shieldEnergy <= 0) {
                this.isGuardBroken = true;
                this.guardBreakTimer = 110;
                this.isBlocking = false;
                this.state = 'HIT';
                sounds.playShieldBreak();
                particles.createImpactSparks(this.x, this.y - 100, '#ff0000', 30);
            }
        } else {
            let finalDamage = amount;

            if (hitType !== 'one_shot' && !hitType.includes('super')) {
                if (attacker.lastAttackUsed === hitType) attacker.sameMoveCount++;
                else { attacker.lastAttackUsed = hitType; attacker.sameMoveCount = 1; }

                const spamMultiplier = attacker.sameMoveCount >= 3 ? 0.5 : 1.0;
                finalDamage = amount * spamMultiplier;
            }

            this.hitstunFrames = hitType === 'heavy_kick' ? 30 : 18;
            this.state = 'HIT';
            this.stateFrame = 0;

            attacker.hasHitTarget = true;
            attacker.canCancel = true;
            attacker.comboCount++;
            attacker.comboTimer = 90;

            if (attacker.comboCount > globalMaxCombo) globalMaxCombo = attacker.comboCount;
            updateComboUI(attacker.comboCount);

            this.vx = attacker.facing * (hitType === 'heavy_kick' ? 18 : 7);
            this.vy = 0;

            this.hp = Math.max(0, this.hp - finalDamage);
        }

        this.addKi(amount * 0.4);
        particles.createImpactSparks(this.x, this.y - 100, '#ff0055', 16);

        if (this.hp <= 0) {
            currentGameState = GAME_STATE.KO;
            showResultsScreen(attacker.name);
        }
    }

    addKi(amount) {
        this.ki = Math.min(700, this.ki + amount);
    }

    updateAI(opponent) {
        if (this.state === 'HIT' || this.isGuardBroken || this.state === 'STUNNED') return;

        const dist = Math.abs(opponent.x - this.x);
        const opponentAttacking = opponent.state === 'ATTACK';

        if (dist > 280) {
            this.isBlocking = false;
            if (Math.random() < 0.03 && this.ki >= 700) this.executeSuper(7, opponent);
            else if (Math.random() < 0.05 && this.ki >= 300) this.executeSuper(3, opponent);
            else if (Math.random() < 0.06 && this.ki >= 100) this.executeSuper(1, opponent);
            else if (this.ki < 500 && Math.random() < 0.04) this.state = 'CHARGING';
            else {
                if (this.state === 'CHARGING') this.state = 'IDLE';
                this.vx = opponent.x > this.x ? 5.5 : -5.5;
                this.state = 'WALK';
            }
        } else if (dist <= 140) {
            if (this.state === 'CHARGING') this.state = 'IDLE';
            if (this.ki >= 700 && Math.random() < 0.15) this.executeSuper(7, opponent);
            else if (opponentAttacking && Math.random() < 0.32) this.startCounter();
            else if (opponentAttacking && this.shieldEnergy > 80 && Math.random() < 0.65) this.isBlocking = true;
            else {
                this.isBlocking = false;
                this.vx = 0;
                if (this.state === 'IDLE' || this.canCancel) {
                    const rand = Math.random();
                    if (rand < 0.45 && this.moveCooldowns.jab <= 0) this.attack('jab');
                    else if (rand < 0.75 && this.moveCooldowns.flurry <= 0) this.attack('flurry');
                    else if (this.moveCooldowns.heavy_kick <= 0) this.attack('heavy_kick');
                }
            }
        } else {
            if (this.state === 'CHARGING') this.state = 'IDLE';
            this.isBlocking = false;
            if (Math.random() < 0.05 && this.dashCharges > 0) this.dash();
            else {
                this.vx = opponent.x > this.x ? 5.5 : -5.5;
                this.state = 'WALK';
            }
        }
    }

    getSpriteKey() {
        if (this.state === 'CHARGING') return 'charging';
        if (this.isBlocking || this.state === 'BLOCK') return 'block';
        if (this.state === 'HIT' || this.isGuardBroken) return 'hit';
        if (this.state === 'STUNNED') return 'stun';
        if (this.state === 'COUNTER') return 'counter';
        if (!this.isGrounded || this.state === 'JUMP') return 'jump';

        if (this.state === 'ATTACK') {
            if (this.currentSuperLevel === 1 || this.currentSuperLevel === 3) return 'super13';
            if (this.currentSuperLevel === 7) return 'super7';

            switch (this.attackType) {
                case 'jab': return 'attack1';
                case 'flurry': return 'attack2';
                case 'heavy_kick': return 'attack3';
                case 'ki_light': return 'attack4';
                case 'ki_heavy': return 'attack5';
                case 'ki_surge': return 'attack6';
                default: return 'attack1';
            }
        }

        return 'idle';
    }

    draw(ctx) {
        ctx.save();

        const spriteKey = this.getSpriteKey();
        const img = SPRITES[spriteKey];

        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1);

        if (this.state === 'CHARGING') {
            ctx.shadowColor = this.config.auraColor;
            ctx.shadowBlur = 45;
        }

        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -this.width / 2, -this.height, this.width, this.height);
        }

        ctx.restore();

        if (this.hitbox) {
            ctx.fillStyle = 'rgba(255, 0, 85, 0.45)'; ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2;
            ctx.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
            ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
        }

        if (debugHitboxes) {
            ctx.strokeStyle = '#00ff66';
            ctx.strokeRect(this.hurtbox.x, this.hurtbox.y, this.hurtbox.w, this.hurtbox.h);
        }
    }
}

// Canvas Loop & Events
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let p1 = new Fighter(1, 'kaito', 300);
let p2 = new Fighter(2, 'ryuko', 980, true);

const keys = {};

window.addEventListener('keydown', (e) => {
    sounds.init();
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
    if (e.key === 'F1') {
        debugHitboxes = !debugHitboxes;
        document.getElementById('debug-indicator').classList.toggle('hidden', !debugHitboxes);
    }
    if (!keys[key]) {
        keys[key] = true;
        handleSinglePressInput(key);
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    if (key === 'w' || key === 'arrowup') { p1.isFloating = false; p2.isFloating = false; }
    
    // Soltar carga de energía al soltar M (P1) o U (P2)
    if (key === 'm' && p1.state === 'CHARGING') p1.state = 'IDLE';
    if (key === 'u' && p2.state === 'CHARGING') p2.state = 'IDLE';
});

function handleSinglePressInput(key) {
    if (currentGameState !== GAME_STATE.FIGHT) return;

    // === JUGADOR 1 (SI NO ESTÁ CARGANDO KI CON M) ===
    if (p1.state !== 'CHARGING') {
        if (key === 'w') {
            if (p1.isGrounded) { p1.vy = -14; p1.isGrounded = false; p1.state = 'JUMP'; }
            else p1.isFloating = true;
        }

        // MAPEO SECUENCIAL EXACTO DE ATAQUES (1 al 6)
        if (key === 'z') p1.attack('jab');          // 1 (attack1)
        if (key === 'x') p1.attack('flurry');       // 2 (attack2)
        if (key === 'c') p1.attack('heavy_kick');   // 3 (attack3)
        if (key === 'v') p1.shootKiBlast(false);    // 4 (attack4)
        if (key === 'b') p1.shootKiBlast(true);     // 5 (attack5)
        if (key === 'n') p1.attack('ki_surge');     // 6 (attack6)

        if (key === ' ') p1.dash();                 // Espacio para Dash
        if (key === 'h') p1.startCounter();

        if (key === 'q') p1.executeSuper(1, p2);
        if (key === 'e') p1.executeSuper(3, p2);
        if (key === 'r') p1.executeSuper(7, p2);
    }

    // === JUGADOR 2 (SI NO ESTÁ CARGANDO KI CON U) ===
    if (!p2.isAI && p2.state !== 'CHARGING') {
        if (key === 'arrowup') {
            if (p2.isGrounded) { p2.vy = -14; p2.isGrounded = false; p2.state = 'JUMP'; }
            else p2.isFloating = true;
        }

        // MAPEO SECUENCIAL EXACTO DE ATAQUES P2
        if (key === 'j') p2.attack('jab');          // 1 (attack1)
        if (key === 'k') p2.attack('flurry');       // 2 (attack2)
        if (key === 'l') p2.attack('heavy_kick');   // 3 (attack3)
        if (key === 'ñ' || key === ';') p2.shootKiBlast(false); // 4 (attack4)
        if (key === 'i') p2.shootKiBlast(true);     // 5 (attack5)
        if (key === 'o') p2.attack('ki_surge');     // 6 (attack6)

        if (key === 'p') p2.startCounter();

        if (key === '8') p2.executeSuper(1, p1);
        if (key === '9') p2.executeSuper(3, p1);
        if (key === '0') p2.executeSuper(7, p1);
    }
}

function processContinuousInput() {
    if (currentGameState !== GAME_STATE.FIGHT) return;

    // CARGA DE ENERGÍA (7): Tecla M para P1 y U para P2
    if (keys['m'] && p1.state !== 'HIT' && !p1.isGuardBroken && p1.state !== 'STUNNED') {
        p1.state = 'CHARGING';
    }

    if (!p2.isAI && keys['u'] && p2.state !== 'HIT' && !p2.isGuardBroken && p2.state !== 'STUNNED') {
        p2.state = 'CHARGING';
    }

    if (p1.state !== 'HIT' && !p1.isGuardBroken && p1.state !== 'STUNNED' && p1.state !== 'CHARGING') {
        p1.isBlocking = keys['s'] || false;
        if (keys['a']) { p1.vx = -6; if (p1.state === 'IDLE') p1.state = 'WALK'; }
        else if (keys['d']) { p1.vx = 6; if (p1.state === 'IDLE') p1.state = 'WALK'; }
    }

    if (!p2.isAI && p2.state !== 'HIT' && !p2.isGuardBroken && p2.state !== 'STUNNED' && p2.state !== 'CHARGING') {
        p2.isBlocking = keys['arrowdown'] || false;
        if (keys['arrowleft']) { p2.vx = -6; if (p2.state === 'IDLE') p2.state = 'WALK'; }
        else if (keys['arrowright']) { p2.vx = 6; if (p2.state === 'IDLE') p2.state = 'WALK'; }
    }
}

function drawStage() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 450);
    skyGrad.addColorStop(0, '#550000');
    skyGrad.addColorStop(0.5, '#aa1100');
    skyGrad.addColorStop(1, '#ff3300');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = 'rgba(255, 200, 0, 0.25)';
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc((Date.now() * 0.1 + i * 160) % 1280, 150 + (i * 30) % 200, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = '#6b0f00';
    ctx.beginPath();
    ctx.moveTo(250, 480); ctx.lineTo(380, 240); ctx.lineTo(900, 240); ctx.lineTo(1030, 480); ctx.fill();
    ctx.strokeStyle = '#2d0600'; ctx.lineWidth = 5; ctx.stroke();

    ctx.fillStyle = '#d9b38c'; ctx.fillRect(320, 360, 640, 160); ctx.strokeRect(320, 360, 640, 160);
    ctx.fillStyle = '#660000'; ctx.fillRect(440, 210, 400, 60);
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 4; ctx.strokeRect(440, 210, 400, 60);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 34px Bangers'; ctx.textAlign = 'center';
    ctx.fillText('天 下 第 一 武 道 会', 640, 252); ctx.textAlign = 'left';

    ctx.fillStyle = '#8c8c7a'; ctx.fillRect(0, 520, 1280, 200);
    ctx.strokeStyle = '#404033'; ctx.lineWidth = 3;
    for (let x = 0; x < 1280; x += 100) { ctx.beginPath(); ctx.moveTo(x, 520); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 520; y < 720; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
}

let matchTimer = 99;
let lastTimerUpdate = Date.now();

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawStage();

    if (currentGameState === GAME_STATE.FIGHT) {
        processContinuousInput();

        if (Date.now() - lastTimerUpdate >= 1000) {
            matchTimer--;
            document.getElementById('timer').innerText = matchTimer;
            lastTimerUpdate = Date.now();
            if (matchTimer <= 0) {
                currentGameState = GAME_STATE.KO;
                showResultsScreen(p1.hp > p2.hp ? p1.name : p2.name);
            }
        }

        p1.update(1/60, p2);
        p2.update(1/60, p1);

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.update();
            proj.draw(ctx);

            const target = proj.owner === p1 ? p2 : p1;
            if (
                proj.x > target.hurtbox.x &&
                proj.x < target.hurtbox.x + target.hurtbox.w &&
                proj.y > target.hurtbox.y &&
                proj.y < target.hurtbox.y + target.hurtbox.h
            ) {
                target.takeDamage(proj.damage, proj.owner, proj.isSuper ? 'super' : 'ki');
                proj.active = false;
            }

            if (!proj.active) projectiles.splice(i, 1);
        }

        checkMeleeHits(p1, p2);
        checkMeleeHits(p2, p1);

        updateHUD();
    }

    particles.update();
    particles.draw(ctx);

    p1.draw(ctx);
    p2.draw(ctx);

    requestAnimationFrame(gameLoop);
}

function checkMeleeHits(attacker, defender) {
    if (attacker.hitbox && defender.hurtbox) {
        const hb = attacker.hitbox;
        const db = defender.hurtbox;

        if (
            hb.x < db.x + db.w &&
            hb.x + hb.w > db.x &&
            hb.y < db.y + db.h &&
            hb.y + hb.h > db.y
        ) {
            defender.takeDamage(hb.damage, attacker, hb.type);
            attacker.hitbox = null;
        }
    }
}

function updateHUD() {
    document.getElementById('p1-health').style.width = (p1.hp / p1.maxHp * 100) + '%';
    document.getElementById('p2-health').style.width = (p2.hp / p2.maxHp * 100) + '%';

    document.getElementById('p1-shield').style.width = (p1.shieldEnergy / p1.maxShieldEnergy * 100) + '%';
    document.getElementById('p2-shield').style.width = (p2.shieldEnergy / p2.maxShieldEnergy * 100) + '%';

    const p1KiSegments = document.querySelectorAll('#p1-ki-container .ki-segment');
    const p1FullBars = Math.floor(p1.ki / 100);
    p1KiSegments.forEach((seg, i) => {
        if (i < p1FullBars) seg.classList.add('full');
        else seg.classList.remove('full');
    });

    const p2KiSegments = document.querySelectorAll('#p2-ki-container .ki-segment');
    const p2FullBars = Math.floor(p2.ki / 100);
    p2KiSegments.forEach((seg, i) => {
        if (i < p2FullBars) seg.classList.add('full');
        else seg.classList.remove('full');
    });

    document.getElementById('p1-ki-level').innerText = Math.min(7, p1FullBars);
    document.getElementById('p2-ki-level').innerText = Math.min(7, p2FullBars);

    document.getElementById('p1-super-fill').style.width = ((p1.ki % 100)) + '%';
    document.getElementById('p2-super-fill').style.width = ((p2.ki % 100)) + '%';

    const p1DashDots = document.querySelectorAll('#p1-dash-charges .dash-dot');
    p1DashDots.forEach((dot, i) => {
        if (i < p1.dashCharges) dot.classList.add('active');
        else dot.classList.remove('active');
    });

    const p2DashDots = document.querySelectorAll('#p2-dash-charges .dash-dot');
    p2DashDots.forEach((dot, i) => {
        if (i < p2.dashCharges) dot.classList.add('active');
        else dot.classList.remove('active');
    });

    document.getElementById('p1-transform-badge').classList.toggle('active', p1.isTransformed);
    document.getElementById('p2-transform-badge').classList.toggle('active', p2.isTransformed);
}

function updateComboUI(hits) {
    const box = document.getElementById('combo-display');
    const count = document.getElementById('combo-count');
    const rating = document.getElementById('combo-rating');

    if (hits > 1) {
        box.classList.remove('hidden');
        count.innerText = hits;

        if (hits >= 30) rating.innerText = '¡MAX SCALED COMBO (-75%)!';
        else if (hits >= 20) rating.innerText = '¡HEAVY SCALED COMBO (-50%)!';
        else if (hits >= 10) rating.innerText = '¡CHAIN SCALED COMBO (-25%)!';
        else rating.innerText = 'TENKAICHI RUSH!';
    } else {
        box.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-arcade').addEventListener('click', () => openCharSelect('arcade'));
    document.getElementById('btn-versus').addEventListener('click', () => openCharSelect('versus'));
    document.getElementById('btn-confirm-char').addEventListener('click', () => confirmCharacter());
    document.getElementById('btn-restart').addEventListener('click', () => restartMatch());
    document.getElementById('btn-main-menu').addEventListener('click', () => showMainMenu());

    document.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const charKey = e.currentTarget.getAttribute('data-char');
            selectCharacter(charKey);
        });
    });
});

function openCharSelect(mode) {
    gameMode = mode;
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('char-select-screen').classList.remove('hidden');
}

function selectCharacter(charKey) {
    selectedCharP1 = charKey;
    document.querySelectorAll('.char-card').forEach(card => card.classList.remove('selected'));
    document.getElementById('card-' + charKey).classList.add('selected');
}

function confirmCharacter() {
    document.getElementById('char-select-screen').classList.add('hidden');
    startGame();
}

function startGame() {
    sounds.init();
    globalMaxCombo = 0;
    resetMatch();
    currentGameState = GAME_STATE.FIGHT;
}

function resetMatch() {
    p1 = new Fighter(1, selectedCharP1, 300);
    const p2Char = selectedCharP1 === 'ryuko' ? 'kaito' : 'ryuko';
    p2 = new Fighter(2, p2Char, 980, gameMode !== 'versus');

    document.getElementById('p1-name').innerText = p1.name;
    document.getElementById('p1-portrait').className = 'portrait ' + (selectedCharP1 === 'kaito' ? 'goku' : selectedCharP1);

    document.getElementById('p2-name').innerText = p2.name;
    document.getElementById('p2-portrait').className = 'portrait ' + (p2Char === 'ryuko' ? 'tien' : 'goku');

    projectiles = [];
    matchTimer = 99;
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('combo-display').classList.add('hidden');
}

function restartMatch() {
    resetMatch();
    currentGameState = GAME_STATE.FIGHT;
}

function showMainMenu() {
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    currentGameState = GAME_STATE.MENU;
}

function showResultsScreen(winnerName) {
    document.getElementById('winner-title').innerText = '¡K.O.!';
    document.getElementById('stat-winner').innerText = 'GANADOR: ' + winnerName;
    document.getElementById('stat-max-combo').innerText = 'COMBO MÁXIMO: ' + globalMaxCombo + ' HITS';
    document.getElementById('result-screen').classList.remove('hidden');
}

requestAnimationFrame(gameLoop);