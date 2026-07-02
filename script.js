// ====================
// Regel-Engine
// ====================

let rulesRegex = [];
let rulesText = [];

document.addEventListener("DOMContentLoaded", async () => {
  const translateBtn = document.getElementById("translateBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");

  translateBtn.disabled = true;

  translateBtn.addEventListener("click", translateText);
  clearBtn.addEventListener("click", clearAll);
  copyBtn.addEventListener("click", copyText);

  await loadRules();

  translateBtn.disabled = false;
});

// ====================
// Regeln laden
// ====================

async function loadRules() {
  const [r1, r2] = await Promise.all([
    fetch("rules_regex.txt").then(r => r.text()),
    fetch("rules_text.txt").then(r => r.text())
  ]);

  rulesRegex = parseRules(r1, true);
  rulesText = parseRules(r2, false);

  console.log("Regex-Regeln:", rulesRegex.length);
  console.log("Text-Regeln:", rulesText.length);
}

function parseRules(text, isRegex) {
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(line => {
      const [pattern, rest] = line.split("=");
      let [repl, meaning] = (rest || "").split("|");

      return {
        pattern: pattern.trim(),
        repl: (repl || "").trim(),
        meaning: (meaning || "").trim(),
        isRegex
      };
    });
}

// ====================
// Regex Builder
// ====================

function buildRegex(rule) {
  try {
    if (rule.isRegex) {
      return new RegExp(rule.pattern, "gi");
    }

    return new RegExp(
      "\\b" + rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
      "gi"
    );
  } catch (e) {
    console.warn("❌ Regex kaputt:", rule.pattern);
    return null;
  }
}

// ====================
// Regel anwenden
// ====================

function applyRule(text, rule, used, regex) {
  return text.replace(regex, (...args) => {
    const match = args[0];
    const groups = args.slice(1);

    let repl = rule.repl.replace(/\$(\d+)/g, (_, i) => {
      return groups[i - 1] ?? "";
    });

    if (rule.meaning) {
      used.push({
        input: match,
        output: repl,
        meaning: rule.meaning,
        rule: rule.pattern
      });
    }

    return repl;
  });
}

// ====================
// Smart-Regeln (k3 / p2 etc.)
// ====================

function smartExpand(text, used) {
  return text.replace(/\b([kp])(\d+)\b/gi, (match, type, num) => {
    let repl = "";

    if (type.toLowerCase() === "k") {
      repl = `${num}re`;
      used.push({
        input: match,
        output: repl,
        meaning: `${num} Maschen rechts stricken`,
        rule: "smart-k"
      });
    }

    if (type.toLowerCase() === "p") {
      repl = `${num}li`;
      used.push({
        input: match,
        output: repl,
        meaning: `${num} Maschen links stricken`,
        rule: "smart-p"
      });
    }

    return repl;
  });
}

// ====================
// Hauptfunktion
// ====================

function translateText() {
  let text = document.getElementById("input").value;
  let used = [];

  if (!text) return;

  // 1. Smart-Regeln
  text = smartExpand(text, used);

  // 2. Regex-Regeln
  for (let rule of rulesRegex) {
    const regex = buildRegex(rule);
    if (!regex) continue;

    if (!text.match(regex)) continue;

    text = applyRule(text, rule, used, regex);
  }

  // 3. Text-Regeln
  for (let rule of rulesText) {
    const regex = buildRegex(rule);
    if (!regex) continue;

    if (!text.match(regex)) continue;

    text = applyRule(text, rule, used, regex);
  }

  // 4. Cleanup
  text = finalize(text);

  // 5. Output
  let output = text;

  if (used.length > 0) {
    output += "\n\n--- mini-Legende ---\n\n";
    output += used.map(u => `${u.input} → ${u.output}`).join("\n");
  }

  document.getElementById("output").value = output;
}

// ====================
// Cleanup
// ====================

function finalize(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}

// ====================
// UI Actions
// ====================

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
}

function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("output").value
  );
}
