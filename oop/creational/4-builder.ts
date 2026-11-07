/**
 * 4. BUILDER
 *
 * "Separate the construction of a complex object from its representation, so
 *  you can build it STEP BY STEP."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * Ordering at Subway: bread → cheese → meat → veggies → sauce → "done".
 * You add only what you want, in a readable order, and the sandwich is
 * handed over at the end. Nobody says "I want sandwich(white, null, chicken,
 * null, null, true, false, mayo)".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES — the "telescoping constructor"
 * ─────────────────────────────────────────────────────────────────────────────
 *     new HttpRequest("POST", "/users", undefined, body, 5000, 3, true)
 *
 *   - What is `3`? What is `true`? You have to open the class to know.
 *   - Want only the 6th param? You must pass undefined for everything before it.
 *   - Easy to swap two numbers by accident (timeout ↔ retries) — no error.
 *   - Validation ("POST needs a body") is awkward in a constructor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. A separate Builder class collects settings via named methods
 *   2. Each method returns `this` → you can chain: .a().b().c()
 *   3. `build()` validates everything and returns the FINAL (often immutable)
 *      object
 *   4. (Optional) A DIRECTOR holds reusable "recipes" (preset step sequences)
 *
 *     new Builder() ──.setX()──.setY()──.setZ()──► build() ──► Product
 *                     (mutable, half-done)          (validate)  (complete)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Object has MANY optional parameters
 *   - Construction needs validation across fields ("POST requires a body")
 *   - You want the result to be IMMUTABLE but still built gradually
 *   - Same steps can produce different representations (SQL string vs object)
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Few fields → a plain constructor is fine
 *   - In TypeScript, an OPTIONS OBJECT ({ timeout: 5000 }) with defaults solves
 *     most of the telescoping problem already (see Variant 3). Use a Builder
 *     when you need step-by-step logic, validation, or conditional building.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: telescoping constructor
// ═════════════════════════════════════════════════════════════════════════════

class HttpRequestBad {
  constructor(
    public method: string,
    public url: string,
    public headers?: Record<string, string>,
    public body?: string,
    public timeoutMs?: number,
    public retries?: number,
    public followRedirects?: boolean,
  ) {}
}

// Quick: which number is the timeout? 🤔  And `true` means...?
const badReq = new HttpRequestBad("POST", "/users", undefined, '{"name":"F"}', 3, 5000, true);
console.log("BAD (timeout & retries swapped, no error!):", badReq.timeoutMs, badReq.retries);

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: classic fluent Builder
// ═════════════════════════════════════════════════════════════════════════════

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// The PRODUCT — immutable once built (all readonly)
class HttpRequest {
  constructor(
    public readonly method: HttpMethod,
    public readonly url: string,
    public readonly headers: Readonly<Record<string, string>>,
    public readonly body: string | undefined,
    public readonly timeoutMs: number,
    public readonly retries: number,
  ) {}

  toString() {
    return `${this.method} ${this.url} headers=${JSON.stringify(this.headers)} body=${
      this.body ?? "-"
    } timeout=${this.timeoutMs}ms retries=${this.retries}`;
  }
}

// The BUILDER — mutable scratchpad with sensible defaults
class HttpRequestBuilder {
  private method: HttpMethod = "GET";
  private headers: Record<string, string> = {};
  private body?: string;
  private timeoutMs = 10_000;
  private retries = 0;

  // Required fields go in the constructor so you can't forget them
  constructor(private readonly url: string) {}

  // Each step returns `this` → enables chaining
  setMethod(method: HttpMethod): this {
    this.method = method;
    return this;
  }

  addHeader(key: string, value: string): this {
    this.headers[key] = value;
    return this;
  }

  // Steps can do extra work — here we set the body AND a header together
  setJsonBody(data: object): this {
    this.body = JSON.stringify(data);
    return this.addHeader("Content-Type", "application/json");
  }

  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  setRetries(count: number): this {
    this.retries = count;
    return this;
  }

  // The final step: VALIDATE then create the immutable product
  build(): HttpRequest {
    if ((this.method === "POST" || this.method === "PUT") && !this.body) {
      throw new Error(`${this.method} request requires a body`);
    }
    if (this.method === "GET" && this.body) {
      throw new Error("GET request must not have a body");
    }
    if (this.retries < 0 || this.retries > 5) {
      throw new Error("retries must be between 0 and 5");
    }

    // Copy headers so later builder changes can't mutate the built object
    return new HttpRequest(
      this.method,
      this.url,
      { ...this.headers },
      this.body,
      this.timeoutMs,
      this.retries,
    );
  }
}

// Reads like a sentence — every value is labeled by the method name
const createUser = new HttpRequestBuilder("/users")
  .setMethod("POST")
  .setJsonBody({ name: "Francis" })
  .addHeader("Authorization", "Bearer abc123")
  .setTimeout(5000)
  .setRetries(3)
  .build();

console.log("GOOD:", createUser.toString());

// Only set what you need — defaults handle the rest
console.log("GOOD:", new HttpRequestBuilder("/health").build().toString());

// Validation catches mistakes at build time
try {
  new HttpRequestBuilder("/users").setMethod("POST").build();
} catch (e) {
  console.log("Validation:", (e as Error).message); // "POST request requires a body"
}

// Conditional building — awkward with constructors, natural with builders
const isAdmin = true;
const reqBuilder = new HttpRequestBuilder("/reports");
if (isAdmin) reqBuilder.addHeader("X-Admin", "1");
console.log("Conditional:", reqBuilder.build().toString());

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Variant 2: DIRECTOR — reusable recipes on top of a builder
//    The director knows the ORDER of steps for common cases.
// ═════════════════════════════════════════════════════════════════════════════

class ApiRequestDirector {
  constructor(private readonly token: string) {}

  // Recipe: authenticated JSON POST with standard timeout/retries
  createJsonPost(url: string, data: object): HttpRequest {
    return new HttpRequestBuilder(url)
      .setMethod("POST")
      .setJsonBody(data)
      .addHeader("Authorization", `Bearer ${this.token}`)
      .setTimeout(5000)
      .setRetries(2)
      .build();
  }

  // Recipe: cheap health check, fail fast
  createHealthCheck(url: string): HttpRequest {
    return new HttpRequestBuilder(url).setTimeout(1000).build();
  }
}

const director = new ApiRequestDirector("abc123");
console.log("Director:", director.createJsonPost("/orders", { item: "laptop" }).toString());
console.log("Director:", director.createHealthCheck("/health").toString());

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Variant 3: the TypeScript-native alternative — OPTIONS OBJECT
//    Named fields + defaults. For simple cases, this is all you need.
//    Reach for a Builder when you need validation steps, conditional building,
//    or helper steps like setJsonBody() that set several things at once.
// ═════════════════════════════════════════════════════════════════════════════

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
};

function makeRequest(url: string, opts: RequestOptions = {}): HttpRequest {
  const { method = "GET", headers = {}, body, timeoutMs = 10_000, retries = 0 } = opts;
  return new HttpRequest(method, url, headers, body, timeoutMs, retries);
}

console.log("Options obj:", makeRequest("/users", { timeoutMs: 2000 }).toString());

// ═════════════════════════════════════════════════════════════════════════════
// 🚀 Variant 4 (ADVANCED): TYPE-SAFE "step" builder  — your original example
//
//    Goal: make `build()` a COMPILE error until all required fields are set.
//
//    Trick #1: the builder is generic over T = "fields set so far".
//              Each setter returns a NEW builder whose T includes the new field.
//                create("Laptop")  → InvoiceBuilder<{ product }>
//                .setAmount(1000)  → InvoiceBuilder<{ product } & { amount }>
//                ...
//    Trick #2: `build(this: InvoiceBuilder<InvoiceBuilderInput>)` — a `this`
//              parameter. TS only lets you call build() when the current
//              builder's T has ALL the fields. Otherwise → red squiggly.
//
//    Bonus: each step returns a NEW builder (immutable) — safe to reuse a
//    partially built builder as a "template".
// ═════════════════════════════════════════════════════════════════════════════

type Invoice = {
  product: string;
  total: number;
};

type InvoiceBuilderInput = {
  product: string;
  amount: number;
  quantity: number;
  taxRate: number;
};

class InvoiceBuilder<T extends Partial<InvoiceBuilderInput>> {
  #actual: T;

  private constructor(actual: T) {
    this.#actual = actual;
  }

  static create(product: string) {
    return new InvoiceBuilder({ product });
  }

  setAmount(amount: number) {
    return new InvoiceBuilder({ ...this.#actual, amount });
  }

  setQuantity(quantity: number) {
    return new InvoiceBuilder({ ...this.#actual, quantity });
  }

  setTaxRate(taxRate: number) {
    return new InvoiceBuilder({ ...this.#actual, taxRate });
  }

  build(this: InvoiceBuilder<InvoiceBuilderInput>): Invoice {
    return {
      product: this.#actual.product,
      total: this.#actual.amount * this.#actual.quantity * (1 + this.#actual.taxRate),
    };
  }
}

const invoice = InvoiceBuilder.create("Laptop")
  .setAmount(1000)
  .setQuantity(2)
  .setTaxRate(0.2)
  .build();

console.log("Type-safe builder:", invoice); // { product: 'Laptop', total: 2400 }

// Uncomment to see the compile error — taxRate & quantity are missing:
// InvoiceBuilder.create("Mouse").setAmount(20).build();
//   ❌ The 'this' context of type 'InvoiceBuilder<{ product: string } & { amount: number }>'
//      is not assignable to method's 'this' of type 'InvoiceBuilder<InvoiceBuilderInput>'

// Real-world builders you've probably used:
//   - Query builders: knex("users").where("id", 1).select("name")
//   - Prisma / Drizzle / TypeORM QueryBuilder
//   - Zod schemas: z.string().min(3).max(20).email()
//   - Test data builders: aUser().withRole("admin").build()

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent       : build complex objects step-by-step, readably
 *   Parts        : Product, Builder (setters return `this`), build(), [Director]
 *   Solves       : telescoping constructors, unclear args, cross-field validation
 *   Put required : in the builder's constructor (or enforce via types, Variant 4)
 *   Put validation: in build()
 *   TS shortcut  : options object with defaults is often enough
 *   vs Factory   : Factory = "which class?" in ONE call
 *                  Builder = "how to configure it" over MANY calls
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Builder replaces long, confusing constructors with named, chainable steps
 *    and a final build() that validates and returns an immutable object. A
 *    Director can hold common recipes. In TS I'd use an options object for
 *    simple cases and a builder when construction has real logic."
 */

export {};
