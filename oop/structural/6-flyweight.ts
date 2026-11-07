/**
 * 6. FLYWEIGHT
 *
 * "Use SHARING to support huge numbers of fine-grained objects efficiently.
 *  Keep the common (heavy) data in shared objects, and store only the unique
 *  (light) data per object."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A printed book. The letter "e" appears 50,000 times, but the printer has
 * ONE "e" design (font, shape, kerning). Each occurrence only stores WHERE it
 * is on the page. You don't redesign the letter "e" for every word.
 *
 * Or: a forest in a video game. 1,000,000 trees, but only 3 tree TYPES (oak,
 * pine, birch). Each type has a big 3D mesh + texture. Each tree only needs
 * its own x, y and size.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES — running out of memory
 * ─────────────────────────────────────────────────────────────────────────────
 *   Millions of objects that each carry a copy of the SAME heavy data:
 *
 *     Tree { x, y, name: "Oak", color: "green", texture: <2MB bitmap> }
 *     Tree { x, y, name: "Oak", color: "green", texture: <2MB bitmap> }
 *     ... × 1,000,000  →  2 TB of textures 💥
 *
 *   Solution: split each object's state in two:
 *
 *     INTRINSIC state  — shared, same for many objects, IMMUTABLE
 *                        (name, color, texture)  → stored ONCE in a Flyweight
 *     EXTRINSIC state  — unique per object, depends on context
 *                        (x, y, size)            → stored per object / passed in
 *
 *     Tree{x,y} ──┐
 *     Tree{x,y} ──┼──► TreeType "Oak" { texture: 2MB }   ← ONE shared object
 *     Tree{x,y} ──┘
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Find the heavy fields that repeat across many objects → intrinsic
 *   2. Move them into a FLYWEIGHT class (immutable!)
 *   3. A FLYWEIGHT FACTORY caches flyweights by key and returns the existing
 *      one if it already exists (never `new` flyweights directly)
 *   4. The "context" objects keep only extrinsic state + a reference to
 *      their flyweight
 *   5. Operations take extrinsic state as parameters: type.draw(x, y)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE  (ALL of these should be true)
 * ─────────────────────────────────────────────────────────────────────────────
 *   - You have a HUGE number of similar objects (thousands to millions)
 *   - Memory is an actual, measured problem
 *   - Most of each object's state can be made shared & immutable
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - You have 50 objects → this is premature optimization, adds complexity
 *   - The "shared" data needs to be mutated per object (then it isn't shared)
 *   - CPU matters more than memory (looking up / passing extrinsic state
 *     costs some time)
 *
 * ⚠️ Flyweights MUST be immutable. If one tree could change the shared Oak
 *    texture, EVERY oak in the forest would change. 🐛
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: every object carries its own copy of heavy data
// ═════════════════════════════════════════════════════════════════════════════

const TEXTURE_SIZE = 50_000; // pretend: 50k-element bitmap per texture

class TreeBad {
  readonly texture: number[];
  constructor(
    public x: number,
    public y: number,
    public name: string,
    public color: string,
  ) {
    // Each tree allocates its OWN identical texture 😱
    this.texture = new Array(TEXTURE_SIZE).fill(name.length);
  }
}

const TREE_COUNT = 2_000;
const kinds: [string, string][] = [
  ["Oak", "green"],
  ["Pine", "darkgreen"],
  ["Birch", "white"],
];

const forestBad: TreeBad[] = [];
for (let i = 0; i < TREE_COUNT; i++) {
  const [name, color] = kinds[i % kinds.length];
  forestBad.push(new TreeBad(Math.random() * 1000, Math.random() * 1000, name, color));
}
const badTextures = new Set(forestBad.map((t) => t.texture)).size;
console.log(`BAD : ${TREE_COUNT} trees → ${badTextures} texture copies (~${badTextures * TEXTURE_SIZE} numbers in memory)`);

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: shared Flyweight (intrinsic) + tiny per-object context (extrinsic)
// ═════════════════════════════════════════════════════════════════════════════

// 2. FLYWEIGHT — intrinsic, shared, immutable
class TreeType {
  readonly texture: readonly number[];

  constructor(
    readonly name: string,
    readonly color: string,
  ) {
    console.log(`  🏭 creating TreeType "${name}" (expensive texture load)`);
    this.texture = Object.freeze(new Array(TEXTURE_SIZE).fill(name.length));
  }

  // 5. extrinsic state is PASSED IN, never stored here
  draw(x: number, y: number, scale: number) {
    return `${this.name}(${this.color}) at (${x.toFixed(0)}, ${y.toFixed(0)}) ×${scale.toFixed(1)}`;
  }
}

// 3. FLYWEIGHT FACTORY — guarantees one instance per unique key
class TreeTypeFactory {
  private static readonly cache = new Map<string, TreeType>();

  static get(name: string, color: string): TreeType {
    const key = `${name}|${color}`;
    let type = this.cache.get(key);
    if (!type) {
      type = new TreeType(name, color);
      this.cache.set(key, type);
    }
    return type;
  }

  static count() {
    return this.cache.size;
  }
}

// 4. CONTEXT — only extrinsic state + a pointer to the shared flyweight
class Tree {
  constructor(
    public x: number,
    public y: number,
    public scale: number,
    private readonly type: TreeType, // shared!
  ) {}

  draw() {
    return this.type.draw(this.x, this.y, this.scale);
  }
}

class Forest {
  private readonly trees: Tree[] = [];

  plant(x: number, y: number, scale: number, name: string, color: string) {
    const type = TreeTypeFactory.get(name, color); // reuse if exists
    this.trees.push(new Tree(x, y, scale, type));
  }

  drawSome(n: number) {
    this.trees.slice(0, n).forEach((t) => console.log("  🌳", t.draw()));
  }

  get size() {
    return this.trees.length;
  }
}

const forest = new Forest();
for (let i = 0; i < TREE_COUNT; i++) {
  const [name, color] = kinds[i % kinds.length];
  forest.plant(Math.random() * 1000, Math.random() * 1000, 0.5 + Math.random(), name, color);
}
forest.drawSome(3);
console.log(
  `GOOD: ${forest.size} trees → ${TreeTypeFactory.count()} texture copies (~${TreeTypeFactory.count() * TEXTURE_SIZE} numbers in memory)`,
);
// 2000 copies → 3 copies. At 1M trees the difference is gigabytes.

// ═════════════════════════════════════════════════════════════════════════════
// ✅ VARIANT: text editor characters (the original GoF example)
// ═════════════════════════════════════════════════════════════════════════════

// Intrinsic: the glyph's look (font + char). Extrinsic: its position.
class Glyph {
  constructor(
    readonly char: string,
    readonly font: string,
  ) {}
  render(position: number) {
    return `'${this.char}'@${position}`;
  }
}

const glyphPool = new Map<string, Glyph>();
function glyph(char: string, font = "Inter-12") {
  const key = char + font;
  if (!glyphPool.has(key)) glyphPool.set(key, new Glyph(char, font));
  return glyphPool.get(key)!;
}

const text = "hello world, hello flyweight";
const rendered = [...text].map((c, i) => glyph(c).render(i));
console.log(`text: ${text.length} chars → ${glyphPool.size} Glyph objects`, rendered.slice(0, 5).join(" "));

// 💡 You already use flyweights in JS without knowing:
//    - String interning: identical string literals often share memory
//    - Small integers / `true` / `undefined` are not separate objects
//    - Object pooling in games (bullets, particles) is a close cousin

// Real-world flyweight usage:
//   - Game engines: GPU instancing (one mesh, many positions)
//   - Text rendering / fonts: one glyph bitmap, many positions
//   - Map apps: one icon image for thousands of map markers
//   - Caching immutable value objects (Currency.of("USD") returns the same one)

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : save memory by sharing common state across many objects
 *   Intrinsic   : shared, immutable, context-free  → in the Flyweight
 *   Extrinsic   : unique per object (position...) → in context / passed in
 *   Factory     : Map<key, flyweight> — return existing, create only if new
 *   MUST        : flyweights are IMMUTABLE
 *   Use only    : huge object counts + measured memory problem
 *   Similar     : Singleton = 1 instance total; Flyweight = 1 instance PER key
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Flyweight reduces memory when you have huge numbers of similar objects by
 *    splitting their state into intrinsic data, which is immutable and shared
 *    through a factory cache, and extrinsic data, which each object keeps or
 *    passes in. A million trees can share three tree-type objects."
 */

export {};
