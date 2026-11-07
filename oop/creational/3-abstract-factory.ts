/**
 * 3. ABSTRACT FACTORY
 *
 * "Provide an interface for creating FAMILIES of related objects without
 *  specifying their concrete classes."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * IKEA sells furniture in STYLES: Modern, Victorian, Scandinavian. Each style
 * has a chair, a sofa, and a table. You don't want a Victorian chair next to a
 * Modern sofa. So you pick ONE style "factory", and every piece it gives you
 * matches.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 * Your app runs on AWS today, needs GCP for one client, and tests should run
 * with no cloud at all. Each environment needs a MATCHING SET:
 *
 *                 Storage           Queue
 *     AWS     →   S3Storage         SqsQueue
 *     GCP     →   GcsStorage        PubSubQueue
 *     Local   →   MemoryStorage     MemoryQueue
 *
 * Without a pattern you get `if (cloud === "aws")` checks all over the code, and
 * eventually a bug where someone mixes S3 with Pub/Sub. 💥
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. Interfaces for each PRODUCT:   Storage, Queue
 *   2. An interface for the FACTORY:  CloudFactory { createStorage(); createQueue(); }
 *   3. One CONCRETE FACTORY per family: AwsFactory, GcpFactory, LocalFactory
 *   4. Client code receives a CloudFactory and never sees "AWS" or "GCP".
 *
 *                       CloudFactory (interface)
 *                 createStorage()   createQueue()
 *                          ▲
 *          ┌───────────────┼────────────────┐
 *     AwsFactory       GcpFactory       LocalFactory
 *     S3 + SQS         GCS + PubSub     Memory + Memory
 *
 *   Pick the factory ONCE (at startup) → the whole app is consistent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🆚 FACTORY METHOD vs ABSTRACT FACTORY (common interview question!)
 * ─────────────────────────────────────────────────────────────────────────────
 *   Factory Method   : creates ONE product; uses INHERITANCE (subclass overrides)
 *   Abstract Factory : creates a FAMILY of products; uses COMPOSITION (you pass
 *                      a factory object in). Each method in it is often a
 *                      factory method itself.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - You have several products that MUST be used together (same family)
 *   - You want to swap a whole family at once (cloud provider, UI theme,
 *     OS-specific widgets, DB driver + query builder, prod vs test doubles)
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Only one product type → use Factory Method / Simple Factory instead
 *   - Adding a NEW PRODUCT type (e.g. `createCache()`) is painful: you must
 *     update the interface AND every concrete factory. Adding a new FAMILY
 *     (e.g. Azure) is easy. Choose this when families change more than products.
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: provider checks everywhere, nothing stops you mixing families
// ═════════════════════════════════════════════════════════════════════════════

function uploadAvatarBad(cloud: string, file: string) {
  if (cloud === "aws") console.log(`  [BAD] S3 upload ${file}`);
  else if (cloud === "gcp") console.log(`  [BAD] GCS upload ${file}`);

  // Oops — someone hardcoded SQS here; on GCP this silently uses the wrong queue
  console.log(`  [BAD] SQS publish "avatar.uploaded"`);
}

uploadAvatarBad("gcp", "me.png");

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD
// Step 1: PRODUCT interfaces
// ═════════════════════════════════════════════════════════════════════════════

interface Storage {
  upload(key: string, data: string): void;
}

interface Queue {
  publish(topic: string, payload: object): void;
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 2: the ABSTRACT FACTORY interface — "a factory that makes a family"
// ═════════════════════════════════════════════════════════════════════════════

interface CloudFactory {
  createStorage(): Storage;
  createQueue(): Queue;
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 3: concrete products, grouped by family
// ═════════════════════════════════════════════════════════════════════════════

// --- AWS family ---
class S3Storage implements Storage {
  upload(key: string, data: string) {
    console.log(`  ☁️  S3 PUT s3://my-bucket/${key} (${data.length} bytes)`);
  }
}
class SqsQueue implements Queue {
  publish(topic: string, payload: object) {
    console.log(`  ☁️  SQS → ${topic}`, payload);
  }
}

// --- GCP family ---
class GcsStorage implements Storage {
  upload(key: string, data: string) {
    console.log(`  🌥️  GCS PUT gs://my-bucket/${key} (${data.length} bytes)`);
  }
}
class PubSubQueue implements Queue {
  publish(topic: string, payload: object) {
    console.log(`  🌥️  Pub/Sub → ${topic}`, payload);
  }
}

// --- Local / test family (no network, inspectable) ---
class MemoryStorage implements Storage {
  public readonly files = new Map<string, string>();
  upload(key: string, data: string) {
    this.files.set(key, data);
    console.log(`  💾 memory stored ${key}`);
  }
}
class MemoryQueue implements Queue {
  public readonly messages: { topic: string; payload: object }[] = [];
  publish(topic: string, payload: object) {
    this.messages.push({ topic, payload });
    console.log(`  💾 memory queued ${topic}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 4: CONCRETE FACTORIES — each one guarantees a matching set
// ═════════════════════════════════════════════════════════════════════════════

class AwsFactory implements CloudFactory {
  createStorage(): Storage {
    return new S3Storage();
  }
  createQueue(): Queue {
    return new SqsQueue();
  }
}

class GcpFactory implements CloudFactory {
  createStorage(): Storage {
    return new GcsStorage();
  }
  createQueue(): Queue {
    return new PubSubQueue();
  }
}

class LocalFactory implements CloudFactory {
  // Keep references so tests can assert on what happened
  public readonly storage = new MemoryStorage();
  public readonly queue = new MemoryQueue();

  createStorage(): Storage {
    return this.storage;
  }
  createQueue(): Queue {
    return this.queue;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 5: CLIENT code — only knows interfaces. Zero `if (cloud === ...)`.
// ═════════════════════════════════════════════════════════════════════════════

class AvatarService {
  private readonly storage: Storage;
  private readonly queue: Queue;

  constructor(factory: CloudFactory) {
    this.storage = factory.createStorage();
    this.queue = factory.createQueue(); // guaranteed same family as storage ✅
  }

  uploadAvatar(userId: string, image: string) {
    const key = `avatars/${userId}.png`;
    this.storage.upload(key, image);
    this.queue.publish("avatar.uploaded", { userId, key });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Step 6: choose the family ONCE, at the edge of the app (composition root)
// ═════════════════════════════════════════════════════════════════════════════

function factoryFor(provider: "aws" | "gcp" | "local"): CloudFactory {
  // This is the ONLY switch on provider in the whole codebase
  switch (provider) {
    case "aws":
      return new AwsFactory();
    case "gcp":
      return new GcpFactory();
    case "local":
      return new LocalFactory();
  }
}

console.log("AWS:");
new AvatarService(factoryFor("aws")).uploadAvatar("u1", "<png bytes>");

console.log("GCP:");
new AvatarService(factoryFor("gcp")).uploadAvatar("u2", "<png bytes>");

// 🧪 In a test: use the local family and inspect what happened
console.log("TEST:");
const local = new LocalFactory();
new AvatarService(local).uploadAvatar("u3", "<png bytes>");
console.log("  stored files:", [...local.storage.files.keys()]); // ["avatars/u3.png"]
console.log("  queued msgs :", local.queue.messages.length); // 1

// Other classic examples of the same idea:
//   - UI themes: LightThemeFactory / DarkThemeFactory → Button, Input, Modal
//   - Cross-platform UI: WindowsFactory / MacFactory → Button, Checkbox
//   - DB: PostgresFactory / MySqlFactory → Connection, QueryBuilder, Migrator

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent        : create FAMILIES of related objects that must match
 *   Parts         : product interfaces, factory interface, 1 factory per family
 *   Big win       : swap an entire family by changing ONE line at startup
 *   Easy to add   : a new FAMILY (AzureFactory)
 *   Hard to add   : a new PRODUCT (createCache → touch every factory)
 *   vs Factory Method : family vs single product; composition vs inheritance
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Abstract Factory is a factory of factories for a product family — like a
 *    CloudFactory that gives me storage and a queue from the same provider.
 *    Clients depend only on the interfaces, so switching AWS to GCP, or to
 *    in-memory fakes for tests, is a one-line change."
 */

export {};
