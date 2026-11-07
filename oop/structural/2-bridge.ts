/**
 * 2. BRIDGE
 *
 * "Split a big class (or a set of closely related classes) into TWO separate
 *  hierarchies — ABSTRACTION and IMPLEMENTATION — which can then vary
 *  independently."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * TV remotes and TVs. There are many kinds of remotes (basic, advanced with
 * mute, voice remote) and many kinds of TVs (Sony, Samsung, LG). You don't
 * build a "SonyBasicRemote", "SonyVoiceRemote", "SamsungBasicRemote"... The
 * remote talks to ANY TV through a common protocol. Remotes and TVs evolve
 * separately. The protocol is the BRIDGE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES — the "class explosion"
 * ─────────────────────────────────────────────────────────────────────────────
 *   You have TWO independent dimensions of variation, and you try to cover
 *   both with inheritance:
 *
 *       Notification
 *        ├── AlertEmail     ├── ReminderEmail     ├── PromoEmail
 *        ├── AlertSms       ├── ReminderSms       ├── PromoSms
 *        └── AlertSlack     └── ReminderSlack     └── PromoSlack
 *
 *   3 types × 3 channels = 9 classes. Add 1 channel → +3 classes. Add 1 type →
 *   +3 classes. It's multiplication (M × N), and logic gets duplicated.
 *
 *   Solution: pull one dimension OUT into its own hierarchy and have the other
 *   one HOLD a reference to it (composition). Now it's addition (M + N):
 *
 *       ABSTRACTION (what)               IMPLEMENTATION (how)
 *       Notification ───── has-a ─────►  MessageSender
 *        ├── Alert            bridge      ├── EmailSender
 *        ├── Reminder                     ├── SmsSender
 *        └── Promo                        └── SlackSender
 *
 *   3 + 3 = 6 classes, and any combination works.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. IMPLEMENTATION interface: low-level primitive operations (send(text))
 *   2. Concrete implementations: EmailSender, SmsSender...
 *   3. ABSTRACTION class: holds an Implementation, defines HIGH-level behavior
 *      in terms of the implementation's primitives
 *   4. Refined abstractions: subclasses of the abstraction (Alert, Reminder)
 *   5. Client picks any abstraction + any implementation at runtime
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - You see class names like `XY`, `XZ`, `WY`, `WZ` → two dimensions mixed
 *   - You want to switch the implementation at RUNTIME
 *   - Platform independence: UI abstraction × OS rendering (Windows/Mac/Linux)
 *   - Both sides should be extendable without touching the other
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Only ONE dimension varies → a simple interface + DI is enough (that's
 *     really Strategy)
 *   - The two sides are tightly coupled anyway → the split adds indirection
 *     with no benefit
 *
 * 💡 Bridge is designed UP FRONT to let two things vary independently.
 *    Adapter is applied AFTER THE FACT to make two existing things fit.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: one class per combination (M × N explosion)
// ═════════════════════════════════════════════════════════════════════════════

class AlertEmailBad {
  send(msg: string) {
    console.log(`  📧 EMAIL: 🚨 ALERT: ${msg.toUpperCase()}`);
  }
}
class AlertSmsBad {
  send(msg: string) {
    console.log(`  📱 SMS: 🚨 ALERT: ${msg.toUpperCase()}`); // alert formatting duplicated
  }
}
class ReminderEmailBad {
  send(msg: string) {
    console.log(`  📧 EMAIL: ⏰ Reminder: ${msg}`); // email logic duplicated
  }
}
class ReminderSmsBad {
  send(msg: string) {
    console.log(`  📱 SMS: ⏰ Reminder: ${msg}`);
  }
}
// ...and we haven't even added Slack or Promo yet. 4 classes → 9 → 16 ...

console.log("BAD:");
new AlertEmailBad().send("server down");
new ReminderSmsBad().send("standup in 5 min");

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: two hierarchies joined by a bridge
// ═════════════════════════════════════════════════════════════════════════════

// ── IMPLEMENTATION side: HOW a message is delivered (low-level primitive) ────
interface MessageSender {
  sendRaw(text: string): void;
}

class EmailSender implements MessageSender {
  constructor(private readonly to: string) {}
  sendRaw(text: string) {
    console.log(`  📧 EMAIL to ${this.to}: ${text}`);
  }
}

class SmsSender implements MessageSender {
  constructor(private readonly phone: string) {}
  sendRaw(text: string) {
    // SMS-specific rule lives in ONE place: 160-char limit
    console.log(`  📱 SMS to ${this.phone}: ${text.slice(0, 160)}`);
  }
}

class SlackSender implements MessageSender {
  constructor(private readonly channel: string) {}
  sendRaw(text: string) {
    console.log(`  💬 SLACK #${this.channel}: ${text}`);
  }
}

// ── ABSTRACTION side: WHAT kind of notification (high-level behavior) ────────
abstract class Notification {
  // 👇 THIS reference is the bridge
  constructor(protected sender: MessageSender) {}

  // Can swap the implementation at runtime
  setSender(sender: MessageSender) {
    this.sender = sender;
  }

  abstract notify(message: string): void;
}

class Alert extends Notification {
  notify(message: string) {
    // alert formatting lives in ONE place, works with ANY sender
    this.sender.sendRaw(`🚨 ALERT: ${message.toUpperCase()}`);
  }
}

class Reminder extends Notification {
  notify(message: string) {
    this.sender.sendRaw(`⏰ Reminder: ${message}`);
  }
}

// Refined abstraction with extra high-level logic, still using only sendRaw()
class Digest extends Notification {
  private items: string[] = [];
  add(item: string) {
    this.items.push(item);
    return this;
  }
  notify(title: string) {
    this.sender.sendRaw(`📰 ${title}:\n${this.items.map((i) => `     • ${i}`).join("\n")}`);
    this.items = [];
  }
}

console.log("GOOD (any combination, no new classes):");
new Alert(new EmailSender("ops@co.com")).notify("server down");
new Alert(new SlackSender("incidents")).notify("server down");
new Reminder(new SmsSender("+65 9123 4567")).notify("standup in 5 min");
new Digest(new SlackSender("general")).add("PR #12 merged").add("Deploy v1.4 done").notify("Daily digest");

// Runtime switch: user changed preference from email → SMS
const reminder = new Reminder(new EmailSender("f@mail.com"));
reminder.notify("pay rent");
reminder.setSender(new SmsSender("+65 9123 4567"));
reminder.notify("pay rent");

// Add a new channel (e.g. PushSender)? 1 class, works with Alert/Reminder/Digest.
// Add a new type (e.g. Promo)? 1 class, works with Email/SMS/Slack.  M + N ✅

// ═════════════════════════════════════════════════════════════════════════════
// 🔧 Your original example, FIXED
//    The old version had PaymentProcessor holding an IPaymentProcessor. That's
//    only ONE dimension (the provider) → it's really Strategy / plain DI.
//    To be a Bridge, the ABSTRACTION side must vary too. Here: payment TYPES
//    (one-time, subscription) × payment PROVIDERS (PayPal, Stripe).
// ═════════════════════════════════════════════════════════════════════════════

// IMPLEMENTATION: the provider (low-level primitive: charge some money)
interface PaymentProvider {
  charge(amount: number, reference: string): void;
}

class PayPal implements PaymentProvider {
  charge(amount: number, reference: string) {
    console.log(`  [PayPal] charged $${amount} (${reference})`);
  }
}

class Stripe implements PaymentProvider {
  charge(amount: number, reference: string) {
    console.log(`  [Stripe] charged $${amount} (${reference})`);
  }
}

// ABSTRACTION: the payment type (high-level business rules)
abstract class Payment {
  constructor(protected readonly provider: PaymentProvider) {}
  abstract process(amount: number): void;
}

class OneTimePayment extends Payment {
  process(amount: number) {
    this.provider.charge(amount, "one-time");
  }
}

class SubscriptionPayment extends Payment {
  constructor(
    provider: PaymentProvider,
    private readonly months: number,
  ) {
    super(provider);
  }
  process(monthlyAmount: number) {
    for (let m = 1; m <= this.months; m++) {
      this.provider.charge(monthlyAmount, `subscription month ${m}/${this.months}`);
    }
  }
}

console.log("Fixed original:");
new OneTimePayment(new PayPal()).process(100);
new SubscriptionPayment(new Stripe(), 3).process(9.99);

// Real-world bridge usage:
//   - JDBC / database drivers: your SQL API (abstraction) × vendor drivers
//   - UI toolkits: Window/Button (abstraction) × OS renderer (implementation)
//   - Loggers: Logger levels/format (abstraction) × transports (console/file/HTTP)
//   - React Native: same components, platform-specific native implementations

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : separate WHAT (abstraction) from HOW (implementation)
 *   Smell       : class names that combine two dimensions (AlertEmail, ...)
 *   Structure   : Abstraction HAS-A Implementation (the "bridge" reference)
 *   Math        : inheritance = M × N classes, bridge = M + N classes
 *   Bonus       : swap the implementation at runtime
 *   vs Strategy : Strategy = one swappable algorithm; Bridge = TWO hierarchies
 *   vs Adapter  : Bridge is designed up-front; Adapter fixes a mismatch later
 *   SOLID       : Single Responsibility + Open/Closed on BOTH sides
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Bridge splits a class that varies in two dimensions into an abstraction
 *    hierarchy and an implementation hierarchy, connected by composition. It
 *    turns an M×N class explosion into M+N classes and lets both sides evolve
 *    and be combined independently, even at runtime."
 */

export {};
