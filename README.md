## 🔍 Natural Language Search (Parsing Logic)

This API supports a simple natural language search endpoint:

```
GET /api/profiles/search?q=<query>
```

Example:

```
/api/profiles/search?q=young female from nigeria
```

---

## 🧠 Parsing Approach

The system uses a **rule-based parsing strategy** to convert user input into SQL filters.

### Step 1: Normalize Input

The query string is converted to lowercase:

```js
const text = q.toLowerCase();
```

---

### Step 2: Keyword Detection

The system checks for specific keywords using `includes()`.

#### Gender Detection

```js
if (text.includes("female")) {
  gender = "female";
} else if (text.includes("male")) {
  gender = "male";
}
```

---

#### Age Group Mapping

| Keyword | SQL Condition         |
| ------- | --------------------- |
| child   | age <= 12             |
| teen    | age BETWEEN 13 AND 19 |
| young   | age BETWEEN 16 AND 24 |
| adult   | age BETWEEN 20 AND 59 |
| senior  | age >= 60             |

---

#### Country Mapping

```js
if (text.includes("nigeria")) {
  country_id = "NG";
}

if (text.includes("usa") || text.includes("america")) {
  country_id = "US";
}
```

---

### Step 3: SQL Query Construction

The detected filters are appended dynamically to the SQL query:

```sql
SELECT * FROM profiles WHERE 1=1
AND gender = ?
AND age BETWEEN ...
AND country_id = ?
```

---

### Step 4: Execution

The query is executed using SQLite:

```js
db.all(query, params, callback);
```

---

## ⚠️ Limitations

This implementation is intentionally simple and has several limitations:

---

### 1. Keyword-Based Only

The parser relies strictly on predefined keywords.

❌ It does NOT understand:

- synonyms (e.g., "ladies" instead of "female")
- complex phrasing
- spelling mistakes

---

### 2. Limited Country Support

Only a few countries are supported:

- Nigeria → NG
- USA / America → US

Other countries in the dataset are not automatically detected.

---

### 3. Overlapping Keywords

Some words may conflict:

- "young adult" may trigger multiple age conditions
- priority handling is basic

---

### 4. No Natural Language Understanding (NLP)

This system does NOT use AI or NLP models.

It is purely:

```
Text → Keyword matching → SQL filters
```

---

### 5. Partial Query Interpretation

Queries like:

```
"people older than 30"
```

are not supported because numerical comparisons are not parsed.

---

### 6. Static Rules

All parsing rules are hardcoded in the backend.

To support new patterns, the code must be updated manually.

---

## 🚀 Future Improvements

Possible enhancements include:

- Adding NLP libraries for better understanding
- Expanding country mapping dynamically
- Supporting numeric comparisons (e.g., "age > 30")
- Handling synonyms and fuzzy matching
- Implementing full-text search

---

## 💡 Summary

This search feature demonstrates how natural language can be translated into structured database queries using rule-based logic.

While simple, it provides a foundation for building more advanced intelligent query systems.
