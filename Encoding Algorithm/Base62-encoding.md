# Base62 Encoding

Base62 uses a total of **62 alphanumeric characters**.

| Character set | Characters | Count |
|---|---|---|
| Digits | `0–9` | 10 |
| Lowercase letters | `a–z` | 26 |
| Uppercase letters | `A–Z` | 26 |
| **Total** | | **62** |

These characters are commonly used to create Base62 encoding, which is useful in system design, especially for **URL shorteners**.

### Example: Base62 character set

```
0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
```

---

## How Many Unique Combinations Can You Create?

If each position can contain any of the 62 characters:

| Length | Possible combinations |
|---|---|
| 1 character | 62^1 = 62 |
| 2 characters | 62^2 = 3,844 |
| 3 characters | 62^3 = 238,328 |
| 4 characters | 62^4 = 14,776,336 |
| 5 characters | 62^5 = 916,132,832 |
| 6 characters | 62^6 = 56,800,235,584 |
| 7 characters | 62^7 = 3,521,614,606,208 |

For a URL shortener, a **6-character Base62 code can represent approximately 56.8 billion combinations**, assuming fixed-length codes and that all combinations are available.

> **Important:** Base62 encoding converts an integer into a string using 62 symbols. It is **not encryption**, and the number of usable short codes depends on your allocation strategy and any reserved codes.
