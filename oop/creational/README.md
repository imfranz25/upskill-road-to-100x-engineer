# Creational Patterns

Creational patterns are about **how objects get created**. Instead of calling `new ConcreteClass()` everywhere, you hide or control the creation step. That makes code more flexible, easier to test and less tied to specific classes.

Read them in order. Each file has an analogy, the problem, a ❌ BAD example, a ✅ GOOD example, variants, a cheat sheet and an interview one-liner.

| # | Pattern | Question it answers | One-line summary |
|---|---------|---------------------|------------------|
| 1 | [Singleton](1-singleton.ts) | *How many?* | Exactly one instance, shared everywhere |
| 2 | [Factory Method](2-factory-method.ts) | *Which class?* | One place decides which concrete class to create |
| 3 | [Abstract Factory](3-abstract-factory.ts) | *Which family?* | Creates a matching set of related objects |
| 4 | [Builder](4-builder.ts) | *How to configure it?* | Builds a complex object step by step, then `build()` |
| 5 | [Prototype](5-prototype.ts) | *Can I copy one?* | Creates new objects by cloning an existing one |

## Which one do I need?

```
Need exactly ONE shared instance?                    → Singleton (or a module export + DI)
Need to pick ONE class based on input/config?        → Factory Method / Simple Factory
Need a SET of objects that must match each other?    → Abstract Factory
Object has many optional params / needs validation?  → Builder
Creating from scratch is expensive / want templates? → Prototype
```

## Commonly confused pairs

- **Factory Method vs Abstract Factory**: one product vs a *family* of products. Factory Method uses inheritance (a subclass overrides `createX()`). Abstract Factory uses composition (you pass a factory object in).
- **Factory vs Builder**: a factory creates the object in **one call** and decides *which* class. A builder creates it over **many calls** and decides *how* it's configured.
- **Prototype vs Factory**: a factory creates from scratch. A prototype copies an existing, already-configured instance.
- **Singleton vs a static class**: a singleton is a real object. It can implement an interface, be passed around and be injected. A class with only static members can't.

## How they connect to SOLID (`../solid`)

- Factories keep client code **Open/Closed**: you add a new type without editing the callers.
- Factories and Abstract Factory support **Dependency Inversion**: clients depend on interfaces and never call `new` on concrete classes.
- Singleton tends to break **Single Responsibility** and hides dependencies. Prefer creating one instance and **injecting** it.

## Running

```bash
npx tsx oop/creational/1-singleton.ts
```
