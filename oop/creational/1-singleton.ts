/**
 * 1. SINGLETON
 *
 * "Ensure a class has only ONE instance, and provide a global access point to it."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A country has ONE government. No matter who asks ("who's the government?"),
 * everyone gets the same answer. You don't create a new government every time
 * you need to pay taxes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 * Some things should exist exactly once in your app:
 *   - A database connection pool (opening 50 pools = 50x connections = DB dies)
 *   - App config loaded from disk/env (read once, share everywhere)
 *   - A logger writing to a single file
 *   - An in-memory cache (two caches = stale/duplicated data)
 *
 * If anyone can call `new Database()`, then sooner or later someone WILL,
 * and you end up with several "single" resources.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS (3 ingredients)
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. `private constructor`   → nobody outside can call `new`
 *   2. `private static instance` → the class stores its one-and-only instance
 *   3. `static getInstance()`  → creates it the first time, returns it after
 *
 *        getInstance() ──► instance exists? ──yes──► return it
 *                                  │
 *                                  no
 *                                  ▼
 *                        create it, store it, return it
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - The resource is expensive to create AND must be shared (pools, caches)
 *   - Having two instances would be a BUG (not just wasteful)
 *
 * ❌ WHEN NOT TO USE (it's often called an "anti-pattern" — here's why)
 * ─────────────────────────────────────────────────────────────────────────────
 *   - It's GLOBAL STATE in disguise. Any code anywhere can mutate it.
 *   - HIDDEN DEPENDENCIES: `class OrderService` calls `Database.getInstance()`
 *     inside a method — you can't tell from the constructor that it needs a DB.
 *   - HARD TO TEST: you can't easily swap in a fake DB, and state leaks between
 *     tests because the instance survives across them.
 *   - Breaks SRP (see ../solid/1-single-responsibility.ts): the class does its
 *     job AND manages its own lifecycle.
 *
 *   👉 Modern approach: create ONE instance at app startup and PASS it in via the
 *      constructor (Dependency Injection — see ../solid/5-dependency-inversion.ts).
 *      You still get "only one", without the global access.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: anyone can create as many instances as they like
// ═════════════════════════════════════════════════════════════════════════════

class DatabaseBad {
  constructor() {
    console.log("  [BAD] Opening a NEW connection pool (expensive!)");
  }
}

// Somewhere in UserService...
const dbA = new DatabaseBad();
// Somewhere in OrderService...
const dbB = new DatabaseBad();

console.log("BAD → same instance?", dbA === dbB); // false → 2 pools opened 😱

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD (Variant 1): classic LAZY singleton
//    "Lazy" = the instance is only created the first time someone asks for it.
// ═════════════════════════════════════════════════════════════════════════════

class Database {
  // (2) The one-and-only instance lives on the class itself
  private static instance: Database | null = null;

  private queryCount = 0;

  // (1) Private constructor → `new Database()` is a compile error outside
  private constructor() {
    console.log("  [GOOD] Opening connection pool (happens only once)");
  }

  // (3) The global access point
  public static getInstance(): Database {
    if (Database.instance === null) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public query(sql: string): void {
    this.queryCount++;
    console.log(`  query #${this.queryCount}: ${sql}`);
  }
}

// const nope = new Database(); // ❌ Error: Constructor of class 'Database' is private

const db1 = Database.getInstance(); // prints "Opening connection pool"
const db2 = Database.getInstance(); // prints nothing — reuses the same one

db1.query("SELECT * FROM users");
db2.query("SELECT * FROM orders"); // query #2 → proves it's shared state

console.log("GOOD → same instance?", db1 === db2); // true ✅

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Variant 2: EAGER singleton
//    Created immediately when the class is loaded. Simpler, but you pay the cost
//    even if nobody ever uses it.
// ═════════════════════════════════════════════════════════════════════════════

class AppConfig {
  public static readonly instance = new AppConfig();

  public readonly env = "production";
  public readonly port = 3000;

  private constructor() {}
}

console.log("AppConfig port:", AppConfig.instance.port);

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Variant 3: MODULE singleton  ⭐ (most common in real TS/Node code)
//
//    ES modules are evaluated ONCE and then cached. So if a file does:
//
//        // logger.ts
//        class Logger { ... }
//        export const logger = new Logger();
//
//    every `import { logger } from "./logger"` gets the SAME object.
//    No private constructor, no getInstance() — the module system does the work.
//    This is what you'll see in most codebases (Prisma client, Redis client, etc).
// ═════════════════════════════════════════════════════════════════════════════

class Logger {
  log(msg: string) {
    console.log(`  [LOG] ${msg}`);
  }
}

export const logger = new Logger(); // ← this IS the singleton
logger.log("module singleton works");

// ═════════════════════════════════════════════════════════════════════════════
// ⚠️ Variant 4: ASYNC singleton (the race-condition trap)
//
//    If creating the instance is async (e.g. fetching remote config), the naive
//    version breaks:
//
//        static async getInstance() {
//          if (!this.instance) this.instance = await RemoteConfig.load(); // ⏳
//          return this.instance;
//        }
//
//    Two callers at the same time both see `instance === null` (the first one
//    is still awaiting) → load() runs TWICE.
//
//    FIX: cache the PROMISE, not the result. The 2nd caller gets the same
//    in-flight promise.
// ═════════════════════════════════════════════════════════════════════════════

class RemoteConfig {
  private static instancePromise: Promise<RemoteConfig> | null = null;

  private constructor(public readonly values: Record<string, string>) {}

  public static getInstance(): Promise<RemoteConfig> {
    if (RemoteConfig.instancePromise === null) {
      RemoteConfig.instancePromise = RemoteConfig.load(); // store promise synchronously
    }
    return RemoteConfig.instancePromise;
  }

  private static async load(): Promise<RemoteConfig> {
    console.log("  [ASYNC] fetching remote config (only once)");
    await new Promise((resolve) => setTimeout(resolve, 50)); // fake network delay
    return new RemoteConfig({ featureX: "on" });
  }
}

// Fired at the same time — still only ONE fetch
Promise.all([RemoteConfig.getInstance(), RemoteConfig.getInstance()]).then(
  ([c1, c2]) => console.log("ASYNC → same instance?", c1 === c2), // true
);

// ═════════════════════════════════════════════════════════════════════════════
// 🧪 THE TESTING PROBLEM + THE BETTER ALTERNATIVE
// ═════════════════════════════════════════════════════════════════════════════

// ❌ Hidden dependency: can't tell UserServiceBad needs a DB, can't swap it
class UserServiceBad {
  getUser(id: number) {
    Database.getInstance().query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// ✅ Dependency injected: still one DB in production, but a fake one in tests
interface Queryable {
  query(sql: string): void;
}

class UserService {
  constructor(private readonly db: Queryable) {}

  getUser(id: number) {
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// Production: wire up the single instance once at startup
new UserService(Database.getInstance()).getUser(1);

// Test: pass a fake — no real DB, no shared state between tests
const fakeDb: Queryable = { query: (sql) => console.log(`  [FAKE] ${sql}`) };
new UserService(fakeDb).getUser(2);

new UserServiceBad().getUser(3); // works, but untestable without the real DB

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent       : exactly one instance + global access
 *   Key parts    : private constructor, static instance, static getInstance()
 *   In TS/Node   : usually just `export const x = new X()` (module singleton)
 *   Async gotcha : cache the Promise, not the awaited value
 *   Downsides    : global state, hidden deps, hard to test
 *   Better       : one instance created at startup + Dependency Injection
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Singleton guarantees one instance via a private constructor and a static
 *    accessor. I use it sparingly — for things like a connection pool — and I
 *    prefer injecting that single instance rather than calling getInstance()
 *    everywhere, so the code stays testable."
 */
