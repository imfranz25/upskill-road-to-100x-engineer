/**
 * 2. FACTORY METHOD (+ Simple Factory)
 *
 * "Define an interface for creating an object, but let subclasses decide which
 *  class to instantiate."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A logistics company has a standard process: "plan delivery → create transport
 * → deliver". Road Logistics creates a TRUCK, Sea Logistics creates a SHIP.
 * The process is the same; only the "create transport" step differs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 * When code does `new EmailSender()` directly, it's GLUED to that concrete
 * class. Want SMS too? You add `if (type === "sms") new SmsSender()` ... and
 * that same if/else gets copy-pasted into every place that sends something.
 * Adding WhatsApp = hunting down every if/else. (Violates Open/Closed —
 * see ../solid/2-open-closed.ts)
 *
 * Factories move the `new` into ONE place, and the rest of the code only talks
 * to an INTERFACE (`Sender`), never to concrete classes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 📚 THERE ARE 2 THINGS PEOPLE CALL "FACTORY" — know the difference!
 * ─────────────────────────────────────────────────────────────────────────────
 *   A) SIMPLE FACTORY (not an official GoF pattern, but super common)
 *      One function/static method with a switch/map: give me a type → I give
 *      you an object.             createSender("sms") → new SmsSender()
 *
 *   B) FACTORY METHOD (the official GoF pattern)
 *      A base class has a workflow that needs an object, and it calls an
 *      ABSTRACT method to get it. Each SUBCLASS overrides that method to decide
 *      which object to create.
 *
 *            NotificationService (abstract)
 *            ├── notify()            ← shared workflow, calls createSender()
 *            └── createSender()      ← abstract "factory method"
 *                    ▲
 *        ┌───────────┴────────────┐
 *   EmailNotificationService   SmsNotificationService
 *   createSender() → Email      createSender() → Sms
 *
 *   (And C) ABSTRACT FACTORY creates FAMILIES of objects → see 3-abstract-factory.ts)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - You don't know ahead of time which concrete class you'll need
 *     (depends on config, user input, environment)
 *   - You want ONE place to change when adding a new type
 *   - Creation is more than just `new` (needs setup, validation, caching)
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Only one implementation exists and that's unlikely to change → just `new` it
 *   - Full Factory Method with subclasses is overkill if a simple map works
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: `new` + if/else scattered everywhere
// ═════════════════════════════════════════════════════════════════════════════

class EmailSenderBad {
  send(to: string, msg: string) {
    console.log(`  📧 email to ${to}: ${msg}`);
  }
}
class SmsSenderBad {
  send(to: string, msg: string) {
    console.log(`  📱 sms to ${to}: ${msg}`);
  }
}

function sendWelcomeBad(channel: string, to: string) {
  // This exact if/else will be copied into sendPasswordReset, sendInvoice, ...
  if (channel === "email") new EmailSenderBad().send(to, "Welcome!");
  else if (channel === "sms") new SmsSenderBad().send(to, "Welcome!");
  // Adding "push"? Edit EVERY function like this one. 😩
}

sendWelcomeBad("email", "francis@example.com");

// ═════════════════════════════════════════════════════════════════════════════
// Shared "product" interface — everything below depends on THIS, not on classes
// ═════════════════════════════════════════════════════════════════════════════

interface Sender {
  send(to: string, msg: string): void;
}

class EmailSender implements Sender {
  send(to: string, msg: string) {
    console.log(`  📧 email to ${to}: ${msg}`);
  }
}

class SmsSender implements Sender {
  send(to: string, msg: string) {
    console.log(`  📱 sms to ${to}: ${msg}`);
  }
}

class PushSender implements Sender {
  send(to: string, msg: string) {
    console.log(`  🔔 push to ${to}: ${msg}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ✅ A) SIMPLE FACTORY — a map from "type" → class  (your engineer example style)
// ═════════════════════════════════════════════════════════════════════════════

const SENDERS = {
  email: EmailSender,
  sms: SmsSender,
  push: PushSender,
} as const;

// `keyof typeof SENDERS` = "email" | "sms" | "push" — auto-updates when you add one
type Channel = keyof typeof SENDERS;

class SenderFactory {
  static create(channel: Channel): Sender {
    return new SENDERS[channel]();
  }
}

function sendWelcome(channel: Channel, to: string) {
  SenderFactory.create(channel).send(to, "Welcome!"); // no if/else here anymore
}

sendWelcome("sms", "+65 9123 4567");
sendWelcome("push", "device-123");
// sendWelcome("fax", "..."); // ❌ compile error — TS knows the valid channels

// 👉 Adding WhatsApp = 1 new class + 1 line in SENDERS. Nothing else changes.

// ─── Your original engineer example (also a Simple Factory) ──────────────────

interface IEngineer {
  salary: number;
  about(): string;
}

class JuniorEngineer implements IEngineer {
  salary = 30000;
  about() {
    return `The salary of a junior SE is ${this.salary}`;
  }
}

class MidEngineer implements IEngineer {
  salary = 100000;
  about() {
    return `The salary of a Mid SE is ${this.salary}`;
  }
}

class SeniorEngineer implements IEngineer {
  salary = 250000;
  about() {
    return `The salary of a Senior SE is ${this.salary}`;
  }
}

const EngineerMap = {
  junior: JuniorEngineer,
  mid: MidEngineer,
  senior: SeniorEngineer,
};

type EngineerLevel = keyof typeof EngineerMap;

class EngineerFactory {
  static create(level: EngineerLevel): IEngineer {
    return new EngineerMap[level]();
  }
}

console.log(EngineerFactory.create("junior").about());
console.log(EngineerFactory.create("senior").salary);

// ═════════════════════════════════════════════════════════════════════════════
// ✅ B) FACTORY METHOD (GoF) — subclasses decide what to create
//
//    Notice: the base class contains REAL logic (validation, formatting,
//    logging). Subclasses only override the ONE thing that varies: which
//    Sender to create. That's the whole point of the pattern.
// ═════════════════════════════════════════════════════════════════════════════

abstract class NotificationService {
  // 🏭 THE factory method — subclasses must implement it
  protected abstract createSender(): Sender;

  // Shared workflow (a "template") — written once, reused by every subclass
  public notify(to: string, msg: string): void {
    if (!to) throw new Error("Recipient required");

    const sender = this.createSender(); // ← doesn't know/care which class
    const formatted = `[${new Date().toISOString().slice(0, 10)}] ${msg}`;
    sender.send(to, formatted);
  }
}

class EmailNotificationService extends NotificationService {
  protected createSender(): Sender {
    return new EmailSender();
  }
}

class SmsNotificationService extends NotificationService {
  protected createSender(): Sender {
    return new SmsSender();
  }
}

// Client code depends only on the abstract NotificationService
function remindUser(service: NotificationService, to: string) {
  service.notify(to, "Your subscription renews tomorrow");
}

remindUser(new EmailNotificationService(), "francis@example.com");
remindUser(new SmsNotificationService(), "+65 9123 4567");

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Bonus: factory that does MORE than `new`  (why factories are useful even
//    with one class: validation, defaults, caching, picking by environment)
// ═════════════════════════════════════════════════════════════════════════════

class ConsoleSender implements Sender {
  send(to: string, msg: string) {
    console.log(`  🖥️  [dev] would send to ${to}: ${msg}`);
  }
}

function createSenderForEnv(env: "development" | "production", channel: Channel): Sender {
  // In dev, never send real emails/SMS — the caller doesn't need to know this
  if (env === "development") return new ConsoleSender();
  return SenderFactory.create(channel);
}

createSenderForEnv("development", "email").send("test@example.com", "hi");

// Real-world examples you've already used:
//   - document.createElement("div")           → factory for DOM elements
//   - React.createElement(...)                 → factory for React elements
//   - Array.from(...), Promise.resolve(...)    → static factory methods
//   - new PrismaClient() vs prisma.$extends()  → returns configured instances

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Simple Factory : one function/map  →  create("sms") returns a Sender
 *   Factory Method : abstract createX() in base class, subclasses override it
 *   Benefit        : client code depends on an INTERFACE, `new` lives in one spot
 *   Adding a type  : new class + register it — no editing of client code (OCP ✅)
 *   TS tip         : `keyof typeof MAP` gives you a type-safe list of keys for free
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Factory Method lets a base class define a workflow but defer WHICH object
 *    gets created to subclasses. In practice I mostly use a simple factory — a
 *    map from type to class — so adding a new variant doesn't touch callers."
 */

export {};
