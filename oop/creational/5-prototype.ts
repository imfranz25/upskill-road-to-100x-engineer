/**
 * 5. PROTOTYPE
 *
 * "Create new objects by COPYING an existing object (the prototype), instead
 *  of building them from scratch."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * Cell division (mitosis): a cell doesn't get assembled atom by atom — it
 * copies itself. Or: you don't retype a contract for each client — you
 * duplicate the template and change the name.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Creating the object is EXPENSIVE (loaded from DB, parsed a big file,
 *      did heavy calculation) — copying is cheaper than re-creating.
 *   2. Copying from OUTSIDE is fragile: outside code can't see private fields,
 *      must know the exact concrete class, and breaks when fields are added.
 *   3. You want many similar objects with small differences (game enemies,
 *      document templates, default configs).
 *
 *   Solution: the object knows how to copy ITSELF → `clone()`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ THE MOST IMPORTANT CONCEPT: SHALLOW vs DEEP COPY
 * ─────────────────────────────────────────────────────────────────────────────
 *   SHALLOW copy: copies the top level only. Nested objects/arrays are SHARED.
 *
 *       original ──► { name: "Orc", stats ──┐ }
 *                                           ├──► { hp: 100 }   ← SAME object!
 *       copy     ──► { name: "Orc", stats ──┘ }
 *
 *       copy.stats.hp = 1  →  original.stats.hp is ALSO 1  🐛
 *
 *   DEEP copy: copies everything recursively. Nothing is shared.
 *
 *       original ──► { name: "Orc", stats ──► { hp: 100 } }
 *       copy     ──► { name: "Orc", stats ──► { hp: 100 } }  ← separate
 *
 *   Copy tools in JS/TS and their gotchas:
 *     { ...obj } / Object.assign  → SHALLOW, and LOSES the class (methods gone)
 *     JSON.parse(JSON.stringify)  → deep, but loses methods, Dates→strings,
 *                                    drops undefined/functions, breaks Map/Set
 *     structuredClone(obj)        → deep, handles Date/Map/Set, but returns a
 *                                    PLAIN object (class methods gone)
 *     custom clone() method       → ✅ full control, keeps the class
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Creating from scratch is costly, and you need many similar objects
 *   - You want to hide concrete classes (clone() returns the right type)
 *   - Preconfigured "templates" (prototype registry) that you copy & tweak
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Objects are cheap and simple → just use a constructor/factory
 *   - Objects with circular references or external resources (sockets, file
 *     handles) — cloning those is tricky or meaningless
 *
 * 💡 FUN FACT: JavaScript itself is a PROTOTYPE-based language.
 *    `Object.create(proto)` makes a new object whose prototype is `proto`.
 *    Classes are syntax sugar on top of that.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD #1: copying from OUTSIDE the class
// ═════════════════════════════════════════════════════════════════════════════

class MonsterBad {
  private secretAiSeed = Math.random(); // outside code can't copy this!

  constructor(
    public name: string,
    public stats: { hp: number; attack: number },
    public loot: string[],
  ) {}
}

const orcBad = new MonsterBad("Orc", { hp: 100, attack: 10 }, ["gold"]);

// Caller must know the class, the constructor order, and which fields exist.
// Private `secretAiSeed` is NOT copied (a new random one is made). Add a field
// to MonsterBad later → this copy code silently goes stale.
const orcCopyBad = new MonsterBad(orcBad.name, orcBad.stats, orcBad.loot);

// And worse: stats & loot are the SAME references (shallow) → shared bug
orcCopyBad.stats.hp = 1;
console.log("BAD → original orc hp:", orcBad.stats.hp); // 1 😱 we changed the original

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD #2: common "quick" clones that lose the class
// ═════════════════════════════════════════════════════════════════════════════

class Greeter {
  constructor(public name: string) {}
  greet() {
    return `Hi, I'm ${this.name}`;
  }
}

const g = new Greeter("Francis");
const spread = { ...g }; // plain object — no prototype!
const viaJson = JSON.parse(JSON.stringify(g)); // plain object — no prototype!

console.log("spread instanceof Greeter?", spread instanceof Greeter); // false
console.log("json   instanceof Greeter?", viaJson instanceof Greeter); // false
// spread.greet(); // ❌ TS error, and at runtime: greet is not a function

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: the object clones ITSELF (deep, keeps class, copies private state)
// ═════════════════════════════════════════════════════════════════════════════

interface Prototype<T> {
  clone(): T;
}

type Stats = { hp: number; attack: number };

class Monster implements Prototype<Monster> {
  // Pretend this was expensive: loaded from DB / calculated pathfinding / etc.
  private readonly aiSeed: number;

  constructor(
    public name: string,
    public stats: Stats,
    public loot: string[],
    public spawnedAt: Date = new Date(),
    aiSeed?: number,
  ) {
    this.aiSeed = aiSeed ?? Math.random();
  }

  clone(): Monster {
    // Inside the class we CAN access private fields ✅
    // and we deep-copy every nested reference ✅
    return new Monster(
      this.name,
      { ...this.stats }, // new stats object (flat, so spread = deep enough)
      [...this.loot], // new array
      new Date(this.spawnedAt), // new Date
      this.aiSeed, // private state preserved
    );
  }

  sameBrainAs(other: Monster) {
    return this.aiSeed === other.aiSeed;
  }

  describe() {
    return `${this.name} (hp ${this.stats.hp}, atk ${this.stats.attack}, loot: ${this.loot.join(", ")})`;
  }
}

const orc = new Monster("Orc", { hp: 100, attack: 10 }, ["gold"]);
const orc2 = orc.clone();

orc2.stats.hp = 1;
orc2.loot.push("axe");

console.log("GOOD original:", orc.describe()); // hp 100, loot: gold
console.log("GOOD clone   :", orc2.describe()); // hp 1,   loot: gold, axe
console.log("clone instanceof Monster?", orc2 instanceof Monster); // true
console.log("private state copied?", orc.sameBrainAs(orc2)); // true

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Clone + SUBCLASSES: callers don't need to know the concrete class
// ═════════════════════════════════════════════════════════════════════════════

class Dragon extends Monster {
  constructor(
    stats: Stats,
    loot: string[],
    public fireDamage: number,
  ) {
    super("Dragon", stats, loot);
  }

  // Override clone so the copy is a Dragon (with fireDamage), not a Monster
  override clone(): Dragon {
    const copy = new Dragon({ ...this.stats }, [...this.loot], this.fireDamage);
    copy.spawnedAt = new Date(this.spawnedAt);
    return copy;
  }

  override describe() {
    return `${super.describe()} 🔥${this.fireDamage}`;
  }
}

// This function works with ANY monster type — polymorphic cloning
function spawnWave(template: Monster, count: number): Monster[] {
  return Array.from({ length: count }, () => template.clone());
}

const wave = spawnWave(new Dragon({ hp: 500, attack: 50 }, ["gem"], 80), 2);
wave.forEach((m, i) => console.log(`wave[${i}]:`, m.describe(), "| is Dragon?", m instanceof Dragon));

// ═════════════════════════════════════════════════════════════════════════════
// ✅ PROTOTYPE REGISTRY — a catalog of preconfigured templates to copy from
//    Build each template ONCE (expensive), then clone cheaply forever.
// ═════════════════════════════════════════════════════════════════════════════

class MonsterRegistry {
  private readonly prototypes = new Map<string, Monster>();

  register(key: string, prototype: Monster): void {
    this.prototypes.set(key, prototype);
  }

  spawn(key: string): Monster {
    const proto = this.prototypes.get(key);
    if (!proto) throw new Error(`Unknown monster: ${key}`);
    return proto.clone(); // always a fresh copy — the template is never mutated
  }
}

const registry = new MonsterRegistry();
registry.register("goblin", new Monster("Goblin", { hp: 30, attack: 5 }, ["copper"]));
registry.register("boss", new Dragon({ hp: 2000, attack: 120 }, ["legendary sword"], 300));

const g1 = registry.spawn("goblin");
const g2 = registry.spawn("goblin");
g1.stats.hp -= 10; // g1 takes damage

console.log("registry g1:", g1.describe()); // hp 20
console.log("registry g2:", g2.describe()); // hp 30 — unaffected
console.log("registry boss:", registry.spawn("boss").describe());

// ═════════════════════════════════════════════════════════════════════════════
// 🔧 Your original example, FIXED
//    The old version used Object.assign({}, this) and JSON round-tripping —
//    both return PLAIN objects, so `objectTwo.clone()` would crash (no method).
// ═════════════════════════════════════════════════════════════════════════════

class ConcretePrototype implements Prototype<ConcretePrototype> {
  constructor(public field: number[] = []) {}

  // Shallow: new instance (keeps class), but the array is SHARED
  shallowClone(): ConcretePrototype {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
  }

  // Deep: new instance AND a new array
  clone(): ConcretePrototype {
    return new ConcretePrototype([...this.field]);
  }
}

const objectOne = new ConcretePrototype([1, 2, 3]);
const shallow = objectOne.shallowClone();
const deep = objectOne.clone();

objectOne.field.push(4);

console.log("objectOne:", objectOne.field); // [1, 2, 3, 4]
console.log("shallow  :", shallow.field); //   [1, 2, 3, 4]  ← shared array!
console.log("deep     :", deep.field); //      [1, 2, 3]     ← independent
console.log("shallow can still clone?", shallow.clone() instanceof ConcretePrototype); // true

// Real-world prototype usage:
//   - structuredClone() for copying state (e.g. Redux/undo history snapshots)
//   - "Duplicate" button in Figma/Notion/Google Docs
//   - Game engines: prefab instantiation (Unity Instantiate(prefab))
//   - Object.create(proto) in plain JS

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : make new objects by cloning an existing one
 *   Key method  : clone() — defined ON the class (can copy private state)
 *   #1 gotcha   : shallow copy shares nested objects → mutate one, break both
 *   JS gotcha   : spread / JSON / structuredClone drop the class (no methods)
 *   Subclasses  : override clone() so the copy keeps the right type
 *   Registry    : Map<key, prototype> → spawn(key) returns proto.clone()
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Prototype creates objects by cloning a preconfigured instance through its
 *    own clone() method, which avoids expensive setup and coupling to concrete
 *    classes. The key detail is deep vs shallow copy — nested references must
 *    be copied or the clone and original will share state."
 */

export {};
