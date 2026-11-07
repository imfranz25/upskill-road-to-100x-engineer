/**
 * 7. PROXY
 *
 * "Provide a SUBSTITUTE (placeholder) for another object to CONTROL ACCESS
 *  to it."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A credit card is a proxy for your bank account. Shops treat it like money
 * (same "interface": pay), but the card adds control: checks your PIN, your
 * limit, flags fraud — and only THEN touches the real account.
 *
 * Or: a celebrity's agent. You don't call the celebrity directly. The agent
 * filters requests, schedules, and only passes through what's worth it.
 *
 *     client ──► [ Proxy ] ──(maybe, later, if allowed, if not cached)──► [ Real ]
 *                 same interface as Real — the client can't tell the difference
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 *   You have an object that is:
 *     - EXPENSIVE to create (loads a 50MB file, opens a DB connection)
 *     - SENSITIVE (only admins may call delete())
 *     - SLOW (remote API) and called with the same args repeatedly
 *     - REMOTE (lives on another server)
 *   ...and you want to add control WITHOUT changing the object or its callers.
 *
 *   Putting that control in every caller = duplication + someone forgets.
 *   Putting it inside the real class = mixes concerns (SRP ❌), and you may
 *   not even own that class.
 *
 *   Solution: a class with the SAME interface that sits in front of the real
 *   object and decides when/whether/how to forward each call.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧩 TYPES OF PROXY (same structure, different purpose)
 * ─────────────────────────────────────────────────────────────────────────────
 *   VIRTUAL    → lazy: create the expensive real object only when first used
 *   PROTECTION → access control: check permissions before forwarding
 *   CACHING    → remember results of expensive calls
 *   LOGGING    → record calls (audit trail, metrics)
 *   REMOTE     → local stand-in for an object on another machine (RPC/gRPC)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Lazy initialization of heavy objects
 *   - Access control / authorization in front of a service
 *   - Caching, rate limiting, or logging calls to a slow/remote service
 *   - The client must NOT know it's talking to a stand-in
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - The object is cheap and has no access rules → extra layer for nothing
 *   - Adds latency / indirection; hidden behavior can surprise people
 *     ("why is this returning stale data?" → a caching proxy)
 *
 * 💡 Proxy vs Decorator: same shape (wrap + same interface). Intent differs.
 *    Decorator = ADD features, client stacks them freely.
 *    Proxy     = CONTROL ACCESS, often creates/owns the real object itself.
 *    Proxy vs Adapter: Adapter CHANGES the interface; Proxy KEEPS it.
 */

// ═════════════════════════════════════════════════════════════════════════════
// The SUBJECT interface + the REAL subject
// ═════════════════════════════════════════════════════════════════════════════

interface Document {
  read(): string;
  delete(): void;
}

class RealDocument implements Document {
  private readonly content: string;

  constructor(private readonly filename: string) {
    // Pretend this is expensive: reading a 50MB file from disk / S3
    console.log(`  💾 [RealDocument] LOADING "${filename}" from disk (slow!)`);
    this.content = `Contents of ${filename}`;
  }

  read() {
    return this.content;
  }

  delete() {
    console.log(`  🗑️  [RealDocument] "${this.filename}" deleted`);
  }
}

type User = { name: string; role: "admin" | "viewer" };

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: eager loading + permission checks scattered in callers
// ═════════════════════════════════════════════════════════════════════════════

console.log("BAD:");
// Loads ALL documents up front, even ones nobody ever opens 😩
const docsBad = ["report.pdf", "salaries.xlsx", "roadmap.docx"].map((f) => new RealDocument(f));

function deleteFromUiBad(user: User, doc: Document) {
  if (user.role !== "admin") throw new Error("forbidden"); // check here...
  doc.delete();
}
function deleteFromCronJobBad(doc: Document) {
  doc.delete(); // ...but someone forgot the check here 🐛
}
deleteFromCronJobBad(docsBad[1]);

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD #1: VIRTUAL PROXY — lazy loading
// ═════════════════════════════════════════════════════════════════════════════

class LazyDocument implements Document {
  private real?: RealDocument; // not created yet!

  constructor(private readonly filename: string) {
    console.log(`  📎 [LazyDocument] placeholder for "${filename}" (instant)`);
  }

  private getReal(): RealDocument {
    // create on FIRST use, then reuse
    this.real ??= new RealDocument(this.filename);
    return this.real;
  }

  read() {
    return this.getReal().read();
  }
  delete() {
    this.getReal().delete();
  }
}

console.log("GOOD virtual proxy:");
const docs: Document[] = ["report.pdf", "salaries.xlsx", "roadmap.docx"].map((f) => new LazyDocument(f));
console.log("  (nothing loaded yet...)");
console.log("  read →", docs[0].read()); // loads ONLY report.pdf, now
console.log("  read →", docs[0].read()); // already loaded, no reload

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD #2: PROTECTION PROXY — access control in ONE place
// ═════════════════════════════════════════════════════════════════════════════

class ProtectedDocument implements Document {
  constructor(
    private readonly inner: Document,
    private readonly user: User,
  ) {}

  read() {
    return this.inner.read(); // everyone can read
  }

  delete() {
    if (this.user.role !== "admin") {
      throw new Error(`⛔ ${this.user.name} (${this.user.role}) cannot delete`);
    }
    this.inner.delete();
  }
}

console.log("GOOD protection proxy:");
const viewer: User = { name: "Bob", role: "viewer" };
const admin: User = { name: "Francis", role: "admin" };

// Proxies compose: Protection(Lazy(Real))
const asViewer = new ProtectedDocument(new LazyDocument("salaries.xlsx"), viewer);
try {
  asViewer.delete();
} catch (e) {
  console.log(" ", (e as Error).message); // blocked — and the file was never even loaded
}
new ProtectedDocument(new LazyDocument("old.txt"), admin).delete(); // allowed

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD #3: CACHING PROXY in front of a slow API
// ═════════════════════════════════════════════════════════════════════════════

interface WeatherApi {
  getTemp(city: string): number;
}

class RealWeatherApi implements WeatherApi {
  calls = 0;
  getTemp(city: string) {
    this.calls++;
    console.log(`  🌐 [RealWeatherApi] HTTP GET /weather?city=${city}`);
    return city === "Singapore" ? 31 : 18;
  }
}

class CachedWeatherApi implements WeatherApi {
  private readonly cache = new Map<string, { value: number; expires: number }>();

  constructor(
    private readonly real: WeatherApi,
    private readonly ttlMs = 60_000,
  ) {}

  getTemp(city: string) {
    const hit = this.cache.get(city);
    if (hit && hit.expires > Date.now()) return hit.value;
    const value = this.real.getTemp(city);
    this.cache.set(city, { value, expires: Date.now() + this.ttlMs });
    return value;
  }
}

console.log("GOOD caching proxy:");
const realApi = new RealWeatherApi();
const weather: WeatherApi = new CachedWeatherApi(realApi);
["Singapore", "Singapore", "London", "Singapore"].forEach((c) => console.log(`  ${c}: ${weather.getTemp(c)}°C`));
console.log("  real HTTP calls:", realApi.calls); // 2, not 4

// ═════════════════════════════════════════════════════════════════════════════
// ✅ BONUS: JavaScript's built-in `Proxy` object
//    The language has this pattern built in — intercept ANY property access.
//    Vue 3 reactivity and MobX are built on it.
// ═════════════════════════════════════════════════════════════════════════════

function withAuditLog<T extends object>(target: T, label: string): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (typeof value === "function") {
        return (...args: unknown[]) => {
          console.log(`  📝 [audit] ${label}.${String(prop)}(${args.join(", ")})`);
          return value.apply(obj, args);
        };
      }
      return value;
    },
    set(obj, prop, value) {
      console.log(`  📝 [audit] ${label}.${String(prop)} = ${value}`);
      return Reflect.set(obj, prop, value);
    },
  });
}

console.log("JS Proxy:");
const audited = withAuditLog(new RealWeatherApi(), "weatherApi");
audited.getTemp("Tokyo");
audited.calls = 100;

// Validation proxy: reject bad writes
const settings = new Proxy({ volume: 50 }, {
  set(obj, prop, value) {
    if (prop === "volume" && (value < 0 || value > 100)) {
      console.log(`  ⛔ rejected volume=${value}`);
      return true; // swallow (return false would throw in strict mode)
    }
    return Reflect.set(obj, prop, value);
  },
});
settings.volume = 150;
settings.volume = 80;
console.log("  volume:", settings.volume);

// Real-world proxy usage:
//   - ORMs (Hibernate, TypeORM lazy relations): user.posts loads on first access
//   - Vue 3 / MobX reactivity: JS Proxy tracks reads & writes
//   - API gateways / Nginx reverse proxy: auth, rate limit, cache in front of services
//   - gRPC / tRPC client stubs: local object that calls a remote server
//   - CDN = caching proxy for your static files

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : stand-in that CONTROLS ACCESS to a real object
 *   Structure   : Proxy implements Subject, holds/creates RealSubject
 *   Types       : virtual (lazy) · protection (auth) · caching · logging · remote
 *   Key rule    : SAME interface → client can't tell it's a proxy
 *   In JS       : `new Proxy(target, { get, set })` built into the language
 *   vs Decorator: same shape; Decorator adds features, Proxy controls access
 *   vs Adapter  : Adapter changes the interface, Proxy keeps it
 *   SOLID       : SRP (access logic separated), Open/Closed (no change to Real)
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "A proxy implements the same interface as a real object and sits in front
 *    of it to control access — lazily creating it, checking permissions,
 *    caching results or forwarding to a remote server — without the client or
 *    the real object having to change."
 */

export {};
