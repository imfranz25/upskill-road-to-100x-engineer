/**
 * 4. DECORATOR (a.k.a. Wrapper)
 *
 * "Attach new behavior to an object DYNAMICALLY by wrapping it in another
 *  object that has the SAME interface."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * Getting dressed. You're still YOU, but you put on a shirt, then a sweater,
 * then a raincoat. Each layer adds something (warmth, waterproofing) without
 * changing you. You can add or remove layers in any order, any combination.
 *
 * Or: ordering coffee. Espresso → + milk → + caramel → + extra shot. Each
 * add-on wraps the drink and adds to the price & description.
 *
 *       client ──► [ Logging ( Retry ( Cache ( RealHttpClient ) ) ) ]
 *                    each layer has the SAME interface, adds one thing,
 *                    then passes the call inward
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES — subclass explosion for optional features
 * ─────────────────────────────────────────────────────────────────────────────
 *   You want optional extras (milk, sugar, caramel...) and try inheritance:
 *
 *     Coffee, CoffeeWithMilk, CoffeeWithSugar, CoffeeWithMilkAndSugar,
 *     CoffeeWithMilkAndCaramel, CoffeeWithMilkAndSugarAndCaramel ...
 *
 *   N features → 2^N subclasses. Can't add a feature at runtime. Can't apply
 *   the same feature twice (double shot).
 *
 *   Solution: each feature is a small WRAPPER class that implements the same
 *   interface, holds the wrapped object, and adds its bit before/after
 *   delegating. Stack them like Lego.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. COMPONENT interface (Coffee: cost(), description())
 *   2. CONCRETE component: the plain thing (Espresso)
 *   3. (Optional) BASE DECORATOR: implements the interface, holds a
 *      `wrapped` component, and delegates everything by default
 *   4. CONCRETE decorators: override methods, call `wrapped`, add behavior
 *   5. Client wraps at runtime: new Caramel(new Milk(new Espresso()))
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Add responsibilities to individual objects at RUNTIME, not to the class
 *   - Cross-cutting concerns: logging, caching, retries, timing, auth, metrics
 *   - Many optional, combinable features (inheritance would explode)
 *   - You can't (or shouldn't) modify the original class
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Only one fixed combination ever exists → just write that class
 *   - ORDER of wrappers matters and is easy to get wrong (cache outside retry
 *     vs inside behaves differently) — document it or build it in one factory
 *   - Deep stacks make debugging harder (stack traces go through many layers)
 *
 * 💡 Decorator vs Proxy: same structure! Decorator ADDS features and the
 *    client usually builds the stack. Proxy CONTROLS ACCESS (lazy load, auth,
 *    cache) and usually manages the real object's lifecycle itself.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: one subclass per combination
// ═════════════════════════════════════════════════════════════════════════════

class CoffeeBad {
  cost() {
    return 3;
  }
}
class CoffeeWithMilkBad extends CoffeeBad {
  override cost() {
    return super.cost() + 0.5;
  }
}
class CoffeeWithMilkAndCaramelBad extends CoffeeWithMilkBad {
  override cost() {
    return super.cost() + 0.7;
  }
}
// CoffeeWithCaramel? CoffeeWithSugarAndCaramel? DoubleMilk? → more classes 😩
// And a customer can't decide "add caramel" AFTER the object is created.
console.log("BAD milk+caramel:", new CoffeeWithMilkAndCaramelBad().cost());

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: stackable decorators
// ═════════════════════════════════════════════════════════════════════════════

// 1. COMPONENT
interface Coffee {
  cost(): number;
  description(): string;
}

// 2. CONCRETE COMPONENT
class Espresso implements Coffee {
  cost() {
    return 3;
  }
  description() {
    return "Espresso";
  }
}

// 3. BASE DECORATOR — delegates everything; subclasses override what they need
abstract class CoffeeDecorator implements Coffee {
  constructor(protected readonly wrapped: Coffee) {}
  cost() {
    return this.wrapped.cost();
  }
  description() {
    return this.wrapped.description();
  }
}

// 4. CONCRETE DECORATORS — each adds ONE thing
class Milk extends CoffeeDecorator {
  override cost() {
    return this.wrapped.cost() + 0.5;
  }
  override description() {
    return `${this.wrapped.description()} + milk`;
  }
}

class Caramel extends CoffeeDecorator {
  override cost() {
    return this.wrapped.cost() + 0.7;
  }
  override description() {
    return `${this.wrapped.description()} + caramel`;
  }
}

class ExtraShot extends CoffeeDecorator {
  override cost() {
    return this.wrapped.cost() + 1;
  }
  override description() {
    return `${this.wrapped.description()} + extra shot`;
  }
}

// 5. Combine freely at runtime — any order, any count
let order: Coffee = new Espresso();
order = new Milk(order);
order = new Caramel(order);
order = new ExtraShot(new ExtraShot(order)); // double extra shot — impossible with subclasses
console.log("GOOD:", order.description(), "→ $", order.cost());

// ═════════════════════════════════════════════════════════════════════════════
// ✅ REAL-WORLD: decorating a data service with logging, caching, retries
//    This is where Decorator really shines in backend code.
// ═════════════════════════════════════════════════════════════════════════════

interface UserService {
  getUser(id: number): string;
}

let dbCalls = 0;
class DbUserService implements UserService {
  getUser(id: number) {
    dbCalls++;
    if (dbCalls === 1) throw new Error("DB connection reset"); // flaky first call
    return `User#${id}`;
  }
}

class LoggingUserService implements UserService {
  constructor(private readonly inner: UserService) {}
  getUser(id: number) {
    const start = Date.now();
    console.log(`  [log] getUser(${id}) →`);
    const result = this.inner.getUser(id);
    console.log(`  [log] getUser(${id}) ← ${result} in ${Date.now() - start}ms`);
    return result;
  }
}

class RetryUserService implements UserService {
  constructor(
    private readonly inner: UserService,
    private readonly attempts = 3,
  ) {}
  getUser(id: number) {
    for (let i = 1; ; i++) {
      try {
        return this.inner.getUser(id);
      } catch (e) {
        console.log(`  [retry] attempt ${i} failed: ${(e as Error).message}`);
        if (i >= this.attempts) throw e;
      }
    }
  }
}

class CachingUserService implements UserService {
  private readonly cache = new Map<number, string>();
  constructor(private readonly inner: UserService) {}
  getUser(id: number) {
    const hit = this.cache.get(id);
    if (hit) {
      console.log(`  [cache] hit for ${id}`);
      return hit;
    }
    const value = this.inner.getUser(id);
    this.cache.set(id, value);
    return value;
  }
}

// DbUserService was NOT modified. Each concern is its own small class (SRP ✅)
// ⚠️ Order matters: here Logging is outermost, Cache before Retry before DB.
const users: UserService = new LoggingUserService(new CachingUserService(new RetryUserService(new DbUserService())));

console.log("1st call:");
users.getUser(42); // retry kicks in, then caches
console.log("2nd call:");
users.getUser(42); // served from cache
console.log("db calls total:", dbCalls); // 2 (1 failed + 1 ok), not 3

// ═════════════════════════════════════════════════════════════════════════════
// ✅ VARIANT: FUNCTION decorators (higher-order functions) — very idiomatic JS
//    Same idea without classes: take a function, return a wrapped function.
// ═════════════════════════════════════════════════════════════════════════════

function withTiming<A extends unknown[], R>(name: string, fn: (...args: A) => R) {
  return (...args: A): R => {
    const t = performance.now();
    const r = fn(...args);
    console.log(`  [timing] ${name} took ${(performance.now() - t).toFixed(2)}ms`);
    return r;
  };
}

function memoize<R>(fn: (n: number) => R) {
  const cache = new Map<number, R>();
  return (n: number): R => {
    if (!cache.has(n)) cache.set(n, fn(n));
    return cache.get(n)!;
  };
}

const slowSquare = (n: number) => {
  for (let i = 0; i < 1e6; i++); // pretend this is heavy
  return n * n;
};
const fastSquare = withTiming("square", memoize(slowSquare));
console.log("fn decorator:", fastSquare(9), fastSquare(9)); // 2nd is instant

// 📌 TS/JS `@decorator` syntax (e.g. NestJS @Get(), Angular @Component) is a
//    language feature inspired by this pattern — it wraps classes/methods at
//    definition time. The GoF Decorator pattern wraps OBJECTS at runtime.

// Real-world decorator usage:
//   - Express/Koa middleware, axios interceptors (wrap request handling)
//   - Java I/O: new BufferedReader(new InputStreamReader(new FileInputStream(f)))
//   - React Higher-Order Components: withRouter(withAuth(MyPage))
//   - Caching / retry / circuit-breaker wrappers around API clients

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : add behavior to an object at runtime without changing it
 *   Structure   : Decorator implements X AND holds an X → wraps → delegates
 *   Key trick   : same interface → decorators are stackable in any combo
 *   Beats       : 2^N subclasses for N optional features
 *   Gotcha      : ORDER of wrappers changes behavior
 *   In JS       : higher-order functions are decorators too
 *   SOLID       : Open/Closed (extend without modifying), SRP (one concern
 *                 per wrapper)
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Decorator wraps an object in another object with the same interface that
 *    adds behavior before or after delegating. Because decorators share the
 *    interface they can be stacked in any combination at runtime — I use it
 *    for cross-cutting concerns like logging, caching and retries instead of
 *    subclassing."
 */

export {};
