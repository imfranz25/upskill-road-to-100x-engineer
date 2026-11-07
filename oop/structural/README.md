# Structural Patterns

Structural patterns are about **how objects are put together**: how classes and objects are combined into bigger structures while those structures stay flexible. Almost all of them rely on one idea, **composition over inheritance**. You wrap an object, or hold a reference to it, instead of subclassing it.

Read them in order. Each file has an analogy, the problem, a ❌ BAD example, a ✅ GOOD example, variants, real-world uses, a cheat sheet and an interview one-liner.

| # | Pattern | Question it answers | One-line summary |
|---|---------|---------------------|------------------|
| 1 | [Adapter](1-adapter.ts) | *It doesn't fit?* | Converts one interface into the one your code expects |
| 2 | [Bridge](2-bridge.ts) | *Two things vary?* | Splits abstraction and implementation into two hierarchies (M+N, not M×N) |
| 3 | [Composite](3-composite.ts) | *Is it a tree?* | Treats single objects and groups of objects the same way |
| 4 | [Decorator](4-decorator.ts) | *Add features at runtime?* | Wraps an object to add behavior, keeping the same interface |
| 5 | [Facade](5-facade.ts) | *Too complex to use?* | One simple entry point to a complicated subsystem |
| 6 | [Flyweight](6-flyweight.ts) | *Too many objects?* | Shares common immutable state to save memory |
| 7 | [Proxy](7-proxy.ts) | *Control access?* | A stand-in that controls access (lazy, auth, cache, remote) |

## Which one do I need?

```
A 3rd-party / legacy API doesn't match my interface?        → Adapter
Class names combine two dimensions (AlertEmail, AlertSms)?  → Bridge
Data is a tree and I keep writing `if (isFolder)`?          → Composite
Optional, stackable extras (logging, caching, milk, sugar)? → Decorator
Callers must call 5 classes in the right order?             → Facade
Millions of similar objects eating memory?                  → Flyweight
Need lazy loading / permission checks / caching in front?   → Proxy
```

## The "wrapper" family: they look the same, but the intent differs

Adapter, Decorator and Proxy all **wrap one object**. Facade wraps **many**.

| Pattern | Wraps | Interface it exposes | Purpose |
|---------|-------|----------------------|---------|
| Adapter | 1 object | **Different** (the one the client expects) | Make it *fit* |
| Decorator | 1 object | **Same** | *Add* behavior (stackable) |
| Proxy | 1 object | **Same** | *Control access* (lazy, auth, cache) |
| Facade | Many objects | **New and simpler** | *Simplify* usage |

## Commonly confused pairs

- **Adapter vs Bridge**: Adapter is applied *after the fact* to make two existing things work together. Bridge is designed *up front* so two dimensions can vary independently.
- **Bridge vs Strategy**: both hold an interface and delegate to it. Strategy swaps one algorithm. Bridge has **two** hierarchies, and the abstraction side has subclasses of its own.
- **Decorator vs Proxy**: same code shape. A decorator adds features, and the client stacks them freely. A proxy controls access and often creates or owns the real object itself.
- **Composite vs Decorator**: both are recursive. A composite holds **many** children and combines their results. A decorator holds **one** wrapped object and adds to it.
- **Flyweight vs Singleton**: a singleton is one instance in total. A flyweight is one shared instance **per key** (Oak, Pine, Birch).
- **Facade vs Adapter**: Adapter puts an existing interface on 1 object. Facade gives many objects a new, simpler interface.

## How they connect to SOLID (`../solid`)

- **Open/Closed**: Adapter (new vendor = new adapter), Decorator (new feature = new wrapper) and Composite (new node type = new class) all extend behavior without editing existing code.
- **Single Responsibility**: each decorator or proxy handles one concern (logging, caching, auth). A facade keeps orchestration out of controllers.
- **Dependency Inversion**: Adapter and Bridge let high-level code depend on *your* interface, not on concrete SDKs.
- **Liskov Substitution**: Composite, Decorator and Proxy only work because the wrapper can be substituted for the real thing (same interface, same contract).

## Running

```bash
npx tsx oop/structural/1-adapter.ts
```
