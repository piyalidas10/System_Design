# YAML

## 1. What is YAML?
**YAML** (YAML Ain't Markup Language) is a human-readable data serialisation format commonly used for configuration files.

**Key characteristics:**
- Indentation-based structure (uses **spaces**, never tabs)
- Superset of JSON (any valid JSON is valid YAML)
- Supports comments (`#`)
- Three core data structures: **scalars**, **mappings**, **sequences**
- File extensions: `.yml` or `.yaml`

```yaml
# This is YAML
name: Piyali Das
role: Senior Frontend Engineer
skills:
  - Angular
  - TypeScript
  - Docker
```

## 2. Basic Syntax Rules

```yaml
# ── Rule 1: Indentation uses SPACES only — never tabs ─────────────────────
parent:
  child: value        # 2 spaces (most common)
    grandchild: deep  # 4 spaces

# ── Rule 2: Key-value pairs use a colon followed by a space ───────────────
name: Piyali          # ✅ correct
name:Piyali           # ❌ missing space after colon

# ── Rule 3: Case-sensitive keys ────────────────────────────────────────────
Name: Alice
name: Bob             # These are TWO different keys

# ── Rule 4: Strings don't need quotes (usually) ────────────────────────────
city: Kolkata
greeting: Hello World

# ── Rule 5: Strings MUST be quoted if they contain special characters ──────
message: "Hello: World"    # colon in value → quote it
path: "C:\\Users\\Piyali"  # backslashes → quote it
version: "1.0"             # looks like a float → quote to keep as string
enabled: "true"            # looks like boolean → quote to keep as string

# ── Rule 6: Consistent indentation within a block ─────────────────────────
server:
  host: localhost    # 2 spaces ✅
  port: 8080         # 2 spaces ✅
  # port:  8080      # 3 spaces ❌ inconsistent (would error in strict parsers)

# ── Rule 7: No duplicate keys (last one wins in most parsers) ─────────────
config:
  timeout: 30
  timeout: 60        # ⚠ duplicate key — most parsers silently use 60
```

---






---
