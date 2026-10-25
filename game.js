// ============================================================
// PIGEON HUSTLE
// You're a city pigeon. Grab every carton of fries in town.
// You only get a few flaps before you have to land again.
// ============================================================

// ---------- Tuning knobs: change these to change how it feels ----------
const WORLD_WIDTH = 3300;   // how wide the whole level is, in pixels
const WORLD_HEIGHT = 600;
const STREET_Y = 560;       // where the sidewalk starts
const WALK_SPEED = 190;
const FLAP_POWER = 340;     // bigger = each flap goes higher
const MAX_FLAPS = 3;        // flaps you get before you must land
const GLIDE_FALL_SPEED = 110; // how slowly you fall while holding flap

// ---------- The level ----------
// Each piece of the city: where it is (x, top), how big (w, h), and what it is.
// "Solid" things (buildings, bins) block you from every side.
// Everything else is a ledge you can flap up through and land on.
const LEVEL = [
  { type: 'bench',    x: 280,  top: 520, w: 130, h: 12 },
  { type: 'bin',      x: 520,  top: 500, w: 50,  h: 60, solid: true },
  { type: 'awning',   x: 680,  top: 430, w: 210, h: 18 },
  { type: 'awning',   x: 980,  top: 340, w: 170, h: 18 },
  { type: 'building', x: 1240, top: 260, w: 280, h: 300, solid: true },
  { type: 'busstop',  x: 1680, top: 450, w: 190, h: 14 },
  { type: 'ac',       x: 1930, top: 380, w: 70,  h: 40 },
  { type: 'building', x: 2080, top: 300, w: 230, h: 260, solid: true },
  { type: 'sign',     x: 2400, top: 220, w: 130, h: 30 },
  { type: 'awning',   x: 2640, top: 400, w: 210, h: 18 },
  { type: 'building', x: 2960, top: 320, w: 280, h: 240, solid: true },
];

// Where the fries are (the center of each carton).
const FRIES = [
  [345, 495], [800, 405], [1065, 315], [1380, 235], [1480, 120],
  [1600, 530], [1775, 425], [2195, 275], [2465, 150], [2745, 530], [3100, 295],
];

class PlayScene extends Phaser.Scene {
  constructor() {
    super('play');
  }

  create() {
    makeTextures(this);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor('#8fc1e8');

    drawSkyline(this);

    // The sidewalk, plus every piece of the level.
    this.solids = [];
    this.ledges = [];
    addPiece(this, { type: 'street', x: 0, top: STREET_Y, w: WORLD_WIDTH, h: WORLD_HEIGHT - STREET_Y, solid: true });
    LEVEL.forEach((piece) => addPiece(this, piece));

    // The fries.
    this.fries = this.physics.add.staticGroup();
    FRIES.forEach(([x, y]) => this.fries.create(x, y, 'fries'));
    this.friesTotal = FRIES.length;
    this.friesEaten = 0;

    // The pigeon!
    this.pigeon = this.physics.add.sprite(80, STREET_Y - 20, 'pigeon');
    this.pigeon.setCollideWorldBounds(true);
    this.pigeon.body.setSize(30, 24).setOffset(5, 8);
    this.flapsLeft = MAX_FLAPS;

    this.physics.add.collider(this.pigeon, this.solids);
    this.physics.add.collider(this.pigeon, this.ledges);
    this.physics.add.overlap(this.pigeon, this.fries, (pigeon, fry) => this.eatFries(fry));

    this.cameras.main.startFollow(this.pigeon, true, 0.1, 0.1);

    // Controls.
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', space: 'SPACE',
      a: 'A', d: 'D', w: 'W', r: 'R',
    });

    this.makeHud();
    this.startTime = this.time.now;
    this.finished = false;
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.scene.restart();
      return;
    }
    if (this.finished) return;

    const body = this.pigeon.body;
    const onGround = body.blocked.down || body.touching.down;
    const left = this.keys.left.isDown || this.keys.a.isDown;
    const right = this.keys.right.isDown || this.keys.d.isDown;
    const flapHeld = this.keys.up.isDown || this.keys.space.isDown || this.keys.w.isDown;
    const flapPressed = Phaser.Input.Keyboard.JustDown(this.keys.up)
      || Phaser.Input.Keyboard.JustDown(this.keys.space)
      || Phaser.Input.Keyboard.JustDown(this.keys.w);

    // Landing gives your flaps back.
    if (onGround) this.flapsLeft = MAX_FLAPS;

    // Walking.
    if (left) {
      this.pigeon.setVelocityX(-WALK_SPEED);
      this.pigeon.setFlipX(true);
    } else if (right) {
      this.pigeon.setVelocityX(WALK_SPEED);
      this.pigeon.setFlipX(false);
    } else {
      this.pigeon.setVelocityX(0);
    }

    // Flapping.
    if (flapPressed && this.flapsLeft > 0) {
      this.pigeon.setVelocityY(-FLAP_POWER);
      this.flapsLeft -= 1;
      this.pigeon.setTexture('pigeon-flap');
      this.time.delayedCall(140, () => this.pigeon.setTexture('pigeon'));
    }

    // Gliding: holding flap while falling slows you down.
    if (flapHeld && !onGround && body.velocity.y > GLIDE_FALL_SPEED) {
      this.pigeon.setVelocityY(GLIDE_FALL_SPEED);
    }

    // A little head-bob while strutting along.
    this.pigeon.angle = onGround && (left || right) ? Math.sin(time / 60) * 6 : 0;

    this.updateHud(time);
  }

  eatFries(fry) {
    fry.disableBody(true, false);
    this.tweens.add({
      targets: fry, y: fry.y - 30, alpha: 0, duration: 300,
      onComplete: () => fry.destroy(),
    });
    this.friesEaten += 1;
    if (this.friesEaten === this.friesTotal) this.win();
  }

  win() {
    this.finished = true;
    this.physics.pause();
    this.updateHud(this.time.now);
    const seconds = ((this.time.now - this.startTime) / 1000).toFixed(1);
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 520, 180, 0x1d2433, 0.9).setScrollFactor(0);
    this.add.text(width / 2, height / 2 - 30, 'HUSTLE COMPLETE!', textStyle(36)).setOrigin(0.5).setScrollFactor(0);
    this.add.text(width / 2, height / 2 + 20, `All fries eaten in ${seconds} seconds`, textStyle(20)).setOrigin(0.5).setScrollFactor(0);
    this.add.text(width / 2, height / 2 + 55, 'Press R to play again', textStyle(16)).setOrigin(0.5).setScrollFactor(0);
  }

  makeHud() {
    this.friesText = this.add.text(16, 14, '', textStyle(20)).setScrollFactor(0);
    this.flapsText = this.add.text(16, 42, '', textStyle(20)).setScrollFactor(0);
    this.timeText = this.add.text(this.scale.width - 16, 14, '', textStyle(20)).setOrigin(1, 0).setScrollFactor(0);

    const help = this.add.text(this.scale.width / 2, 90,
      'Grab all the fries!\n← → walk   ↑ / Space flap   hold to glide',
      textStyle(18)).setOrigin(0.5).setAlign('center').setScrollFactor(0);
    this.tweens.add({ targets: help, alpha: 0, delay: 4000, duration: 1000 });
  }

  updateHud(time) {
    this.friesText.setText(`Fries: ${this.friesEaten} / ${this.friesTotal}`);
    this.flapsText.setText('Flaps: ' + '●'.repeat(this.flapsLeft) + '○'.repeat(MAX_FLAPS - this.flapsLeft));
    this.timeText.setText(`Time: ${((time - this.startTime) / 1000).toFixed(1)}`);
  }
}

function textStyle(size) {
  return { fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, color: '#ffffff', stroke: '#1d2433', strokeThickness: 4 };
}

// ---------- Building the city ----------

// Adds one piece of the level: draws it and gives it a physics body to stand on.
function addPiece(scene, piece) {
  const { x, top, w, h } = piece;
  drawPiece(scene, piece);

  const zone = scene.add.zone(x + w / 2, top + h / 2, w, h);
  scene.physics.add.existing(zone, true);

  if (piece.solid) {
    scene.solids.push(zone);
  } else {
    // Ledges only catch you from above, so you can flap up through them.
    zone.body.checkCollision.down = false;
    zone.body.checkCollision.left = false;
    zone.body.checkCollision.right = false;
    scene.ledges.push(zone);
  }
}

function drawPiece(scene, { type, x, top, w, h }) {
  const g = scene.add.graphics();

  if (type === 'street') {
    g.fillStyle(0xa3a6ad).fillRect(x, top, w, 14);        // sidewalk
    g.fillStyle(0x7d8088).fillRect(x, top + 14, w, 4);    // curb
    g.fillStyle(0x3b3f48).fillRect(x, top + 18, w, h);    // road
    g.fillStyle(0x8d9098);
    for (let i = x; i < x + w; i += 60) g.fillRect(i, top, 2, 14); // sidewalk cracks
    g.fillStyle(0xf2d14b);
    for (let i = x + 20; i < x + w; i += 80) g.fillRect(i, top + 28, 40, 4); // road lines
  }

  if (type === 'bench') {
    g.fillStyle(0x4a3b2a).fillRect(x + 10, top + h, 6, STREET_Y - top - h);
    g.fillRect(x + w - 16, top + h, 6, STREET_Y - top - h);
    g.fillStyle(0x9b6b3d).fillRect(x, top, w, h);
  }

  if (type === 'bin') {
    g.fillStyle(0x2f6b3f).fillRect(x, top + 6, w, h - 6);
    g.fillStyle(0x245532).fillRect(x - 4, top, w + 8, 8);
    g.fillStyle(0x3d8551);
    for (let i = x + 8; i < x + w - 4; i += 12) g.fillRect(i, top + 14, 4, h - 22);
  }

  if (type === 'awning') {
    // A café front underneath, then the striped awning on top.
    g.fillStyle(0xc9a27a).fillRect(x + 10, top + h, w - 20, STREET_Y - top - h);
    g.fillStyle(0x6fa3c7).fillRect(x + 24, top + h + 20, w - 48, 50); // window
    for (let i = 0; i < w; i += 20) {
      g.fillStyle((i / 20) % 2 === 0 ? 0xd94b4b : 0xf5f1e6);
      g.fillRect(x + i, top, Math.min(20, w - i), h);
      g.fillTriangle(x + i, top + h, x + i + Math.min(20, w - i), top + h, x + i + Math.min(10, (w - i) / 2), top + h + 8);
    }
  }

  if (type === 'building') {
    g.fillStyle(0x8a4b3a).fillRect(x, top, w, h);
    g.fillStyle(0x5e3328).fillRect(x - 6, top, w + 12, 10); // roof ledge
    g.fillStyle(0xf5d97a);
    for (let wy = top + 30; wy < top + h - 50; wy += 55) {
      for (let wx = x + 20; wx < x + w - 40; wx += 50) g.fillRect(wx, wy, 26, 34);
    }
    g.fillStyle(0x3b2a24).fillRect(x + w / 2 - 20, top + h - 60, 40, 60); // door
  }

  if (type === 'busstop') {
    g.fillStyle(0x5a6270).fillRect(x + 10, top + h, 6, STREET_Y - top - h);
    g.fillRect(x + w - 16, top + h, 6, STREET_Y - top - h);
    g.fillStyle(0xbfe3f2, 0.5).fillRect(x + 16, top + h + 10, w - 32, STREET_Y - top - h - 30); // glass
    g.fillStyle(0x2a6fb0).fillRect(x, top, w, h);
    g.fillStyle(0xffffff).fillCircle(x + w - 30, top - 18, 12);
    g.fillStyle(0x2a6fb0).fillRect(x + w - 31, top - 6, 3, 6);
  }

  if (type === 'ac') {
    g.fillStyle(0x9ea6b0).fillRect(x + w / 2 - 3, top + h, 6, STREET_Y - top - h); // pipe down the wall
    g.fillStyle(0xd3d8de).fillRect(x, top, w, h);
    g.fillStyle(0x9ea6b0);
    for (let i = top + 8; i < top + h - 4; i += 7) g.fillRect(x + 8, i, w - 16, 3);
  }

  if (type === 'sign') {
    g.fillStyle(0x444a55).fillRect(x + w / 2 - 3, top + h, 6, 80); // sign post
    g.fillStyle(0xf2c230).fillRect(x, top, w, h);
    scene.add.text(x + w / 2, top + h / 2, 'PIZZA', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#b3261e', fontStyle: 'bold' }).setOrigin(0.5);
  }
}

// Two layers of buildings in the background. They scroll slower than the
// level, which makes the city feel deep (this trick is called "parallax").
function drawSkyline(scene) {
  const rnd = new Phaser.Math.RandomDataGenerator(['pigeon']);
  const layers = [
    { color: 0x6d86a8, windows: 0x8fa6c4, speed: 0.3, min: 160, max: 380 },
    { color: 0x55698a, windows: 0xe8d58a, speed: 0.6, min: 120, max: 300 },
  ];
  layers.forEach((layer) => {
    const g = scene.add.graphics().setScrollFactor(layer.speed);
    const width = WORLD_WIDTH * layer.speed + scene.scale.width;
    for (let x = 0; x < width; ) {
      const w = rnd.between(60, 140);
      const h = rnd.between(layer.min, layer.max);
      g.fillStyle(layer.color).fillRect(x, STREET_Y - h, w, h);
      g.fillStyle(layer.windows);
      for (let wy = STREET_Y - h + 15; wy < STREET_Y - 20; wy += 28) {
        for (let wx = x + 10; wx < x + w - 14; wx += 22) {
          if (rnd.frac() < 0.55) g.fillRect(wx, wy, 10, 14);
        }
      }
      x += w + rnd.between(0, 20);
    }
  });
}

// ---------- Drawing the pigeon and the fries ----------
// We draw these with code for now. Later we can swap in real artwork.
function makeTextures(scene) {
  if (scene.textures.exists('pigeon')) return;

  const drawPigeon = (key, wingUp) => {
    const g = scene.add.graphics();
    g.fillStyle(0x6b7079).fillTriangle(1, 17, 10, 13, 10, 24);   // tail
    g.fillStyle(0x8a8f99).fillEllipse(19, 20, 28, 18);           // body
    g.fillStyle(0x4f8a7a).fillEllipse(28, 14, 11, 11);           // shiny neck
    g.fillStyle(0x9aa0aa).fillCircle(31, 9, 6);                  // head
    g.fillStyle(0xff8c1a).fillCircle(33, 8, 2);                  // eye
    g.fillStyle(0x111111).fillCircle(33.5, 8, 1);
    g.fillStyle(0xe8c07a).fillTriangle(36, 8, 40, 10, 36, 12);   // beak
    g.fillStyle(0xe07a8a).fillRect(15, 28, 2, 4).fillRect(21, 28, 2, 4); // feet
    g.fillStyle(0x6b7079);
    if (wingUp) g.fillTriangle(10, 17, 24, 17, 13, 1);
    else g.fillEllipse(17, 19, 17, 9);
    g.generateTexture(key, 40, 32);
    g.destroy();
  };
  drawPigeon('pigeon', false);
  drawPigeon('pigeon-flap', true);

  const g = scene.add.graphics();
  g.fillStyle(0xffd23f);
  [3, 6, 9, 12, 15].forEach((fx, i) => g.fillRect(fx, 1 + (i % 2) * 3, 2, 12)); // fries
  g.fillStyle(0xd62828).fillRect(2, 10, 16, 13);                               // carton
  g.fillStyle(0xffd23f).fillCircle(10, 16, 3);
  g.generateTexture('fries', 20, 24);
  g.destroy();
}

// ---------- Start the game ----------
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
  scene: PlayScene,
});
