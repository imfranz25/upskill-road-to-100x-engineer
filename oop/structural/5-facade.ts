/**
 * 5. FACADE
 *
 * "Provide ONE simple interface to a complex subsystem."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * Ordering food at a restaurant. You tell the waiter "one pasta, please".
 * Behind the scenes: the kitchen checks stock, the chef cooks, the cashier
 * bills you, the dishwasher cleans up. You don't walk into the kitchen and
 * coordinate them yourself. The waiter is the FACADE.
 *
 *     client ──► [ OrderFacade.placeOrder() ]
 *                     │
 *          ┌──────────┼───────────┬──────────────┬───────────┐
 *          ▼          ▼           ▼              ▼           ▼
 *      Inventory   Payment     Shipping      Invoice      Email
 *                 (the complex subsystem — still there, still usable)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 *   A task needs many classes called in the RIGHT ORDER with the RIGHT data:
 *   check stock → reserve → charge card → (if fail, release stock) → create
 *   shipment → send email. If every controller / CLI / cron job does this
 *   itself:
 *     - the sequence is duplicated in many places (and drifts apart)
 *     - callers are coupled to 5+ classes and their quirks
 *     - one subsystem change (new Payment API) → edit every caller
 *     - someone forgets the "release stock on payment failure" step 🐛
 *
 *   Solution: one class with a simple, task-focused method that does the
 *   orchestration. Callers use the facade; the subsystem stays hidden.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Identify a common, multi-step task clients perform on a subsystem
 *   2. Create a Facade class that holds (or receives via DI) the subsystem
 *      objects
 *   3. Expose a few HIGH-LEVEL methods (placeOrder, cancelOrder)
 *   4. The facade does NOT add new business logic — it COORDINATES
 *   5. Subsystem classes don't know the facade exists. Advanced clients can
 *      still use them directly.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - A simple entry point to a complex library / subsystem
 *   - Layering: controllers call a service facade, not 6 repositories
 *   - Hide a messy legacy system behind a clean API
 *   - Reduce coupling: callers depend on 1 class instead of N
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - The subsystem is already simple → the facade is a useless extra layer
 *   - The facade grows into a "God object" that knows everything → split it
 *     into several focused facades (OrderFacade, AccountFacade...)
 *
 * 💡 Facade vs Adapter: Adapter makes ONE object fit an EXISTING interface.
 *    Facade defines a NEW, simpler interface over MANY objects.
 */

// ═════════════════════════════════════════════════════════════════════════════
// The complex SUBSYSTEM (each class is fine on its own)
// ═════════════════════════════════════════════════════════════════════════════

class Inventory {
  private stock: Record<string, number> = { "sku-keyboard": 5, "sku-mouse": 0 };
  isAvailable(sku: string, qty: number) {
    return (this.stock[sku] ?? 0) >= qty;
  }
  reserve(sku: string, qty: number) {
    this.stock[sku] -= qty;
    console.log(`  [Inventory] reserved ${qty}× ${sku}`);
  }
  release(sku: string, qty: number) {
    this.stock[sku] += qty;
    console.log(`  [Inventory] released ${qty}× ${sku}`);
  }
}

class PaymentService {
  charge(card: string, amount: number): string {
    if (card.startsWith("0000")) throw new Error("card declined");
    console.log(`  [Payment] charged $${amount}`);
    return "pay_" + Date.now();
  }
  refund(paymentId: string) {
    console.log(`  [Payment] refunded ${paymentId}`);
  }
}

class ShippingService {
  createShipment(address: string, sku: string): string {
    console.log(`  [Shipping] shipment for ${sku} → ${address}`);
    return "TRACK-" + Math.floor(Math.random() * 10000);
  }
}

class EmailService {
  send(to: string, subject: string) {
    console.log(`  [Email] to ${to}: "${subject}"`);
  }
}

const PRICES: Record<string, number> = { "sku-keyboard": 80, "sku-mouse": 40 };

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: the client orchestrates the whole subsystem itself
// ═════════════════════════════════════════════════════════════════════════════

// Imagine this copy-pasted into: the web controller, the mobile API, the
// admin panel, and a bulk-import script. Each one slightly different. 😬
function checkoutControllerBad(sku: string, qty: number, card: string, email: string, address: string) {
  const inventory = new Inventory();
  const payments = new PaymentService();
  const shipping = new ShippingService();
  const mailer = new EmailService();

  if (!inventory.isAvailable(sku, qty)) return "out of stock";
  inventory.reserve(sku, qty);
  const paymentId = payments.charge(card, PRICES[sku] * qty);
  // 🐛 forgot to release stock if charge() throws — easy mistake when every
  //    caller has to remember every step
  const tracking = shipping.createShipment(address, sku);
  mailer.send(email, `Order shipped! Tracking ${tracking}`);
  return `ok (${paymentId})`;
}

console.log("BAD →", checkoutControllerBad("sku-keyboard", 1, "4242", "f@mail.com", "Singapore"));

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: a Facade with one task-focused method
// ═════════════════════════════════════════════════════════════════════════════

type OrderRequest = { sku: string; qty: number; card: string; email: string; address: string };
type OrderResult = { ok: true; tracking: string } | { ok: false; reason: string };

class OrderFacade {
  // Subsystem objects injected → still testable, still swappable (DIP ✅)
  constructor(
    private readonly inventory = new Inventory(),
    private readonly payments = new PaymentService(),
    private readonly shipping = new ShippingService(),
    private readonly mailer = new EmailService(),
  ) {}

  placeOrder({ sku, qty, card, email, address }: OrderRequest): OrderResult {
    if (!this.inventory.isAvailable(sku, qty)) {
      return { ok: false, reason: "out of stock" };
    }

    this.inventory.reserve(sku, qty);

    let paymentId: string;
    try {
      paymentId = this.payments.charge(card, PRICES[sku] * qty);
    } catch (e) {
      this.inventory.release(sku, qty); // ✅ compensation step lives in ONE place
      return { ok: false, reason: (e as Error).message };
    }

    try {
      const tracking = this.shipping.createShipment(address, sku);
      this.mailer.send(email, `Order shipped! Tracking ${tracking}`);
      return { ok: true, tracking };
    } catch (e) {
      this.payments.refund(paymentId);
      this.inventory.release(sku, qty);
      return { ok: false, reason: "shipping failed" };
    }
  }
}

// Every caller is now ONE line, and always does the steps correctly
const shop = new OrderFacade();
console.log("GOOD ok      →", shop.placeOrder({ sku: "sku-keyboard", qty: 1, card: "4242", email: "f@mail.com", address: "SG" }));
console.log("GOOD no stock→", shop.placeOrder({ sku: "sku-mouse", qty: 1, card: "4242", email: "f@mail.com", address: "SG" }));
console.log("GOOD declined→", shop.placeOrder({ sku: "sku-keyboard", qty: 1, card: "0000", email: "f@mail.com", address: "SG" }));

// ═════════════════════════════════════════════════════════════════════════════
// ✅ VARIANT: facade over a "scary" low-level API
//    Classic home-theater example — many devices, one button.
// ═════════════════════════════════════════════════════════════════════════════

class Projector {
  on() { console.log("  projector on"); }
  setInput(src: string) { console.log(`  projector input → ${src}`); }
  off() { console.log("  projector off"); }
}
class SoundSystem {
  on() { console.log("  sound on"); }
  setVolume(v: number) { console.log(`  volume → ${v}`); }
  off() { console.log("  sound off"); }
}
class Lights {
  dim(pct: number) { console.log(`  lights → ${pct}%`); }
}
class Streaming {
  play(title: string) { console.log(`  ▶ playing "${title}"`); }
  stop() { console.log("  ■ stopped"); }
}

class HomeTheaterFacade {
  constructor(
    private projector = new Projector(),
    private sound = new SoundSystem(),
    private lights = new Lights(),
    private player = new Streaming(),
  ) {}

  watchMovie(title: string) {
    console.log("🎬 watchMovie:");
    this.lights.dim(10);
    this.projector.on();
    this.projector.setInput("HDMI1");
    this.sound.on();
    this.sound.setVolume(25);
    this.player.play(title);
  }

  endMovie() {
    console.log("🛑 endMovie:");
    this.player.stop();
    this.sound.off();
    this.projector.off();
    this.lights.dim(100);
  }
}

const theater = new HomeTheaterFacade();
theater.watchMovie("Inception");
theater.endMovie();

// Real-world facade usage:
//   - jQuery: $(".btn").hide() over messy cross-browser DOM APIs
//   - axios / fetch wrappers: api.getUser(id) over headers/auth/JSON parsing
//   - AWS SDK "high-level" clients (e.g. S3 Upload manager over multipart calls)
//   - Service layer in MVC: controller → OrderService (facade) → repos/APIs
//   - A library's index.ts that exposes a few functions over many internals

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : one simple entry point to a complex subsystem
 *   Structure   : Facade holds many subsystem objects, exposes few methods
 *   It does     : ORCHESTRATE (order of calls, data passing, error handling)
 *   It doesn't  : hide the subsystem completely — power users can go direct
 *   Pitfall     : facade growing into a God object → split by use case
 *   vs Adapter  : Adapter = 1 object, existing interface; Facade = many
 *                 objects, NEW simpler interface
 *   SOLID/other : reduces coupling (Law of Demeter), keeps callers SRP-clean
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Facade gives a simple, task-oriented interface over a complex subsystem.
 *    It coordinates several classes in the right order — including error
 *    handling — so callers depend on one class instead of many, and changes
 *    inside the subsystem don't ripple out to every client."
 */

export {};
