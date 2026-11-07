/**
 * 3. COMPOSITE
 *
 * "Compose objects into TREE structures, and let clients treat individual
 *  objects and groups of objects THE SAME WAY."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🧠 REAL-LIFE ANALOGY
 * ─────────────────────────────────────────────────────────────────────────────
 * A company org chart. Ask "what's the total salary cost?" of a single
 * engineer → their salary. Ask the same question of a team → the team lead
 * asks each member and adds it up. Ask the CEO → it ripples down the whole
 * tree. Same question, same answer shape, no matter if it's one person or
 * 10,000 people.
 *
 * Or: folders and files. A folder can hold files AND other folders. "How big
 * is it?" works on both.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔥 THE PROBLEM IT SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 *   You have a tree of "leaves" (File) and "containers" (Folder). Without the
 *   pattern, every piece of code that walks the tree must ask:
 *
 *       if (node is File)   → do X
 *       else if (node is Folder) → loop over children, recurse, combine
 *
 *   That `instanceof` / `type ===` check gets copy-pasted into size(),
 *   print(), search(), delete()... Add a new node type (Symlink, ZipArchive)
 *   → hunt down and edit every one of those functions.
 *
 *   Solution: leaves and containers implement the SAME interface. The
 *   container implements each operation by delegating to its children.
 *
 *              «interface» Component
 *                 getSize() / print()
 *                  ▲               ▲
 *                  │               │
 *              Leaf (File)    Composite (Folder) ──children──► Component[]
 *              does the work  loops over children & combines
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚙️ HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 *   1. COMPONENT interface: operations common to leaves & containers
 *   2. LEAF: does the real work, has no children
 *   3. COMPOSITE: holds a list of Components (leaves OR other composites),
 *      implements operations by calling them on each child and combining
 *   4. Client calls methods on the ROOT and never checks node types
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ WHEN TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Your data is naturally a TREE (file system, UI components, menus, org
 *     chart, product bundles, nested comments, AST / expressions)
 *   - You want clients to ignore the difference between one item and a group
 *
 * ❌ WHEN NOT TO USE
 * ─────────────────────────────────────────────────────────────────────────────
 *   - Your data isn't hierarchical (a flat list doesn't need this)
 *   - Leaves and containers have very DIFFERENT operations → forcing one
 *     interface leads to methods that throw "not supported" (breaks Liskov)
 */

// ═════════════════════════════════════════════════════════════════════════════
// ❌ BAD: type checks everywhere
// ═════════════════════════════════════════════════════════════════════════════

type FileBad = { kind: "file"; name: string; size: number };
type FolderBad = { kind: "folder"; name: string; children: (FileBad | FolderBad)[] };
type NodeBad = FileBad | FolderBad;

function sizeBad(node: NodeBad): number {
  if (node.kind === "file") return node.size;
  return node.children.reduce((sum, c) => sum + sizeBad(c), 0);
}

function countFilesBad(node: NodeBad): number {
  if (node.kind === "file") return 1; // same branching again...
  return node.children.reduce((sum, c) => sum + countFilesBad(c), 0);
}
// print(), search(), delete()... each repeats the `if kind === ...` dance.
// Add a "symlink" kind → edit EVERY function (violates Open/Closed).

const rootBad: NodeBad = {
  kind: "folder",
  name: "root",
  children: [
    { kind: "file", name: "a.txt", size: 100 },
    { kind: "folder", name: "img", children: [{ kind: "file", name: "cat.png", size: 2000 }] },
  ],
};
console.log("BAD size:", sizeBad(rootBad), "| files:", countFilesBad(rootBad));

// ═════════════════════════════════════════════════════════════════════════════
// ✅ GOOD: one interface for leaf AND container
// ═════════════════════════════════════════════════════════════════════════════

// 1. COMPONENT
interface FileSystemNode {
  readonly name: string;
  getSize(): number;
  countFiles(): number;
  print(indent?: string): void;
  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode[];
}

// 2. LEAF — does the actual work
class File implements FileSystemNode {
  constructor(
    public readonly name: string,
    private readonly size: number,
  ) {}

  getSize() {
    return this.size;
  }
  countFiles() {
    return 1;
  }
  print(indent = "") {
    console.log(`${indent}📄 ${this.name} (${this.size}b)`);
  }
  find(predicate: (node: FileSystemNode) => boolean) {
    return predicate(this) ? [this] : [];
  }
}

// 3. COMPOSITE — delegates to children and combines results
class Folder implements FileSystemNode {
  private readonly children: FileSystemNode[] = [];

  constructor(public readonly name: string) {}

  add(...nodes: FileSystemNode[]): this {
    this.children.push(...nodes);
    return this; // chainable
  }

  remove(node: FileSystemNode) {
    const i = this.children.indexOf(node);
    if (i >= 0) this.children.splice(i, 1);
  }

  getSize() {
    // doesn't care if a child is a File or another Folder ✨
    return this.children.reduce((sum, c) => sum + c.getSize(), 0);
  }
  countFiles() {
    return this.children.reduce((sum, c) => sum + c.countFiles(), 0);
  }
  print(indent = "") {
    console.log(`${indent}📁 ${this.name}/ (${this.getSize()}b)`);
    this.children.forEach((c) => c.print(indent + "   "));
  }
  find(predicate: (node: FileSystemNode) => boolean): FileSystemNode[] {
    const self = predicate(this) ? [this] : [];
    return [...self, ...this.children.flatMap((c) => c.find(predicate))];
  }
}

// A NEW node type plugs in with ZERO changes to Folder or the client 🎉
class Shortcut implements FileSystemNode {
  constructor(
    public readonly name: string,
    private readonly target: FileSystemNode,
  ) {}
  getSize() {
    return 1; // a shortcut itself is tiny
  }
  countFiles() {
    return 0;
  }
  print(indent = "") {
    console.log(`${indent}🔗 ${this.name} → ${this.target.name}`);
  }
  find(predicate: (node: FileSystemNode) => boolean) {
    return predicate(this) ? [this] : [];
  }
}

const cat = new File("cat.png", 2000);
const root = new Folder("root").add(
  new File("a.txt", 100),
  new Folder("img").add(cat, new File("dog.png", 3000)),
  new Folder("docs").add(new Folder("2024").add(new File("tax.pdf", 500))),
  new Shortcut("cat-link", cat),
);

root.print();
console.log("GOOD size:", root.getSize(), "| files:", root.countFiles());
console.log(
  "big files:",
  root.find((n) => n instanceof File && n.getSize() > 1000).map((n) => n.name),
);

// The CLIENT treats a single file and a whole tree identically:
function report(node: FileSystemNode) {
  console.log(`report → ${node.name}: ${node.getSize()}b`);
}
report(cat); // leaf
report(root); // whole tree

// ═════════════════════════════════════════════════════════════════════════════
// ✅ Another classic: shopping cart with BUNDLES (price of item or of a box)
// ═════════════════════════════════════════════════════════════════════════════

interface Priced {
  price(): number;
}

class Product implements Priced {
  constructor(
    public name: string,
    private readonly cost: number,
  ) {}
  price() {
    return this.cost;
  }
}

class Bundle implements Priced {
  constructor(
    public name: string,
    private readonly items: Priced[],
    private readonly discount = 0, // e.g. 0.1 = 10% off the bundle
  ) {}
  price() {
    const total = this.items.reduce((s, i) => s + i.price(), 0);
    return +(total * (1 - this.discount)).toFixed(2);
  }
}

const setup = new Bundle(
  "Desk setup",
  [new Product("Monitor", 300), new Bundle("Keyboard+Mouse", [new Product("Keyboard", 80), new Product("Mouse", 40)], 0.1)],
  0.05,
);
const cart: Priced[] = [new Product("Coffee", 5), setup];
console.log("cart total:", cart.reduce((s, i) => s + i.price(), 0));

// Real-world composite usage:
//   - The DOM: every Node has children; element.textContent walks the tree
//   - React: components render components (a tree of the same "shape")
//   - File systems, menus/sub-menus, org charts
//   - Expression trees: Add(Number(1), Multiply(Number(2), Number(3))).eval()
//   - Permission groups containing users and other groups

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 📝 CHEAT SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *   Intent      : treat a single object and a group of objects the same way
 *   Shape       : TREE — Leaf (no children) & Composite (has Component[])
 *   Key trick   : Composite implements operations by recursing into children
 *   Win         : no `instanceof` / `kind ===` checks in client code
 *   New types   : add a class implementing Component, nothing else changes
 *   Pitfall     : don't force leaf-only/container-only methods into the shared
 *                 interface (add/remove on a File → throws → breaks Liskov)
 *
 * 🎤 INTERVIEW ONE-LINER
 *   "Composite organizes objects into a tree where leaves and containers share
 *    one interface, and containers implement each operation by delegating to
 *    their children. Clients can call getSize() or render() on one item or a
 *    whole hierarchy without knowing which it is."
 */

export {};
