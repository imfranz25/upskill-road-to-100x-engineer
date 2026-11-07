/**
 * 1. ADAPTER (a.k.a. Wrapper)
 *
 * "Convert the interface of a class into ANOTHER interface that clients expect.
 *  Lets classes work together that couldn't otherwise because of incompatible
 *  interfaces."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A travel plug adapter. Your laptop has a US plug (flat pins), the wall in
 * Europe has round holes. You don't rewire the laptop or the wall — you put a
 * small adapter in between. The laptop doesn't know, the wall doesn't care.
 *
 *     [Your code] ──expects──► Target interface
 *                                   ▲
 *                                   │ implements
 *                              [ ADAPTER ] ──wraps & translates──► [Adaptee]
 *                                                                  (3rd-party /
 *                                                                   legacy code)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 *   You have code that expects interface A. You want to use a class that
 *   offers interface B (a 3rd-party SDK, a legacy module, another team's API).
 *   You CAN'T (or shouldn't) change either side:
 *     - 3rd-party code isn't yours to edit
 *     - your app has 50 places that already use interface A
 *
 *   Without an adapter, the "translation" (units, names, argument shapes,
 *   callbacks → promises...) leaks into EVERY call site.
 *
 *   Solution: ONE small class that implements A and internally calls B.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Define the TARGET interface (what your code wants)
 *   2. Create an ADAPTER class that `implements Target`
 *   3. The adapter holds a reference to the ADAPTEE (composition)
 *   4. Each Target method TRANSLATES the call: rename methods, convert units,
 *      reshape arguments, map results/errors back
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Integrating a 3rd-party library / SDK whose API doesn't match yours
 *   - Wrapping legacy code so new code can use a clean interface
 *   - Swapping vendors (Stripe → PayPal) without touching business logic
 *   - Making several different libraries look the SAME to your app
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - The interfaces already match → it's just a pointless pass-through
 *   - You own both sides and can simply change one of them
 *   - You want to ADD behavior (logging, caching) to the SAME interface → that's
 *     Decorator / Proxy, not Adapter
 *
 * 💡 Adapter changes the INTERFACE. Decorator & Proxy keep the SAME interface.
 */

// ═════════════════════════════════════════════════════════════════════════════
// Setup: two 3rd-party SDKs we DON'T control (pretend they're from npm)
// ═════════════════════════════════════════════════════════════════════════════

// "Stripe-like" SDK: amounts in CENTS, object argument, returns { id, status }
class StripeSdk {
  createCharge(opts: { amountInCents: number; currency: string; source: string }) {
    console.log(`  [StripeSdk] charging ${opts.amountInCents} cents (${opts.currency}) to ${opts.source}`);
    return { id: "ch_" + Math.floor(Math.random() * 1000), status: "succeeded" as const };
  }
}

// "PayPal-like" SDK: amount as a STRING in dollars, positional args, returns boolean
class PayPalSdk {
  makePayment(email: string, total: string): boolean {
    console.log(`  [PayPalSdk] paying $${total} from ${email}`);
    return true;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: every call site translates the vendor API itself
// ═════════════════════════════════════════════════════════════════════════════

class CheckoutServiceBad {
  private stripe = new StripeSdk();
  private paypal = new PayPalSdk();

  checkout(provider: "stripe" | "paypal", amountUsd: number, customer: string) {
    // Vendor details (cents vs string dollars, result shapes) are mixed into
    // business logic. Same mess will be copy-pasted into refunds, subscriptions...
    if (provider === "stripe") {
      const res = this.stripe.createCharge({
        amountInCents: Math.round(amountUsd * 100),
        currency: "usd",
        source: customer,
      });
      return res.status === "succeeded";
    } else {
      return this.paypal.makePayment(customer, amountUsd.toFixed(2));
    }
    // Add a 3rd provider → edit this method (and every other one like it) 😩
  }
}

console.log("BAD →", new CheckoutServiceBad().checkout("stripe", 19.99, "card_123"));

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: define OUR interface, write one adapter per vendor
// ═════════════════════════════════════════════════════════════════════════════

// 1. TARGET: what OUR app wants — dollars as a number, a clean result object
interface PaymentGateway {
  pay(amountUsd: number, customer: string): PaymentResult;
}

type PaymentResult = { ok: boolean; transactionId?: string };

// 2. ADAPTER for Stripe
class StripeAdapter implements PaymentGateway {
  constructor(private readonly stripe: StripeSdk) {} // 3. wraps the adaptee

  pay(amountUsd: number, customer: string): PaymentResult {
    // 4. translate: dollars → cents, positional → object, result → our shape
    const res = this.stripe.createCharge({
      amountInCents: Math.round(amountUsd * 100),
      currency: "usd",
      source: customer,
    });
    return { ok: res.status === "succeeded", transactionId: res.id };
  }
}

// ADAPTER for PayPal
class PayPalAdapter implements PaymentGateway {
  constructor(private readonly paypal: PayPalSdk) {}

  pay(amountUsd: number, customer: string): PaymentResult {
    const ok = this.paypal.makePayment(customer, amountUsd.toFixed(2));
    return { ok };
  }
}

// Business logic only knows OUR interface. Zero vendor details. 🎉
class CheckoutService {
  constructor(private readonly gateway: PaymentGateway) {}

  checkout(amountUsd: number, customer: string) {
    const result = this.gateway.pay(amountUsd, customer);
    return result.ok ? "✅ order confirmed" : "❌ payment failed";
  }
}

console.log("GOOD stripe →", new CheckoutService(new StripeAdapter(new StripeSdk())).checkout(19.99, "card_123"));
console.log("GOOD paypal →", new CheckoutService(new PayPalAdapter(new PayPalSdk())).checkout(19.99, "f@mail.com"));
// New vendor? Write a new adapter. CheckoutService is never touched (Open/Closed ✅)

// ═════════════════════════════════════════════════════════════════════════════
// ✅ VARIANT: adapting a CALLBACK API into a PROMISE API
//    Very common in real JS work (Node's util.promisify is exactly this).
// ═════════════════════════════════════════════════════════════════════════════

// Legacy module: Node-style callback (err, data)
const legacyUserDb = {
  findUser(id: number, cb: (err: Error | null, user?: { id: number; name: string }) => void) {
    setTimeout(() => (id > 0 ? cb(null, { id, name: "Francis" }) : cb(new Error("not found"))), 10);
  },
};

// What our modern code wants
interface UserRepository {
  findById(id: number): Promise<{ id: number; name: string }>;
}

class LegacyUserDbAdapter implements UserRepository {
  findById(id: number) {
    return new Promise<{ id: number; name: string }>((resolve, reject) => {
      legacyUserDb.findUser(id, (err, user) => (err || !user ? reject(err) : resolve(user)));
    });
  }
}

new LegacyUserDbAdapter().findById(1).then((u) => console.log("promise adapter →", u));

// ═════════════════════════════════════════════════════════════════════════════
// 📚 OBJECT adapter vs CLASS adapter
// ═════════════════════════════════════════════════════════════════════════════
//   OBJECT adapter (used above): adapter HOLDS the adaptee (composition).
//     ✅ works with any subclass of the adaptee, ✅ preferred in TS/JS
//
//   CLASS adapter: adapter EXTENDS the adaptee (inheritance).
//     ⚠️ TS has single inheritance, and the adapter now exposes ALL of the
//        adaptee's methods too (leaky). Shown only so you recognize it:

class StripeClassAdapter extends StripeSdk implements PaymentGateway {
  pay(amountUsd: number, customer: string): PaymentResult {
    const res = this.createCharge({ amountInCents: Math.round(amountUsd * 100), currency: "usd", source: customer });
    return { ok: res.status === "succeeded", transactionId: res.id };
  }
}
console.log("class adapter →", new StripeClassAdapter().pay(5, "card_999").ok);

// ═════════════════════════════════════════════════════════════════════════════
// 🔧 Your original example, FIXED
//    The old PowerOutletAdapter took a Phone and called phone.useCharger() —
//    the SAME interface on both sides, so nothing was being adapted. It was
//    just a pass-through. A real adapter sits between TWO DIFFERENT interfaces.
// ═════════════════════════════════════════════════════════════════════════════

// TARGET: the wall in Europe only accepts things with round pins
interface EuropeanSocketPlug {
  plugIntoRoundHoles(): string;
}

// ADAPTEE: your US charger has flat pins (can't change it)
class USCharger {
  insertFlatPins(): string {
    return "⚡ charging via flat US pins";
  }
}

// ADAPTER: round pins on the outside, flat-pin socket on the inside
class USToEUPlugAdapter implements EuropeanSocketPlug {
  constructor(private readonly charger: USCharger) {}

  plugIntoRoundHoles(): string {
    return `[round→flat adapter] ${this.charger.insertFlatPins()}`;
  }
}

// The wall only knows about EuropeanSocketPlug
function europeanWall(plug: EuropeanSocketPlug) {
  console.log("EU wall →", plug.plugIntoRoundHoles());
}

// europeanWall(new USCharger()); // ❌ TS error: no plugIntoRoundHoles
europeanWall(new USToEUPlugAdapter(new USCharger())); // ✅

// Real-world adapter usage:
//   - ORMs / DB drivers: one Repository interface, adapters for Postgres/Mongo
//   - Payment / email / SMS providers behind your own interface
//   - util.promisify (callback → promise)
//   - React: wrapping a jQuery/D3 widget in a component
//   - "Anti-corruption layer" in DDD = adapters around a legacy system

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : make an incompatible interface fit the one your code expects
 *   Roles       : Target (your interface), Adaptee (theirs), Adapter (translator)
 *   Structure   : Adapter implements Target, HOLDS Adaptee, translates calls
 *   Key word    : TRANSLATE (names, units, arg shapes, callbacks→promises)
 *   Not to mix  : Decorator/Proxy keep the same interface; Adapter changes it
 *   SOLID       : Open/Closed (new vendor = new adapter), Dependency Inversion
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Adapter wraps an object with an incompatible interface and exposes the
 *    interface my code expects, translating each call. I use it to isolate
 *    3rd-party SDKs and legacy code so business logic depends only on my own
 *    interface and vendors can be swapped by writing a new adapter."
 */

export {};
