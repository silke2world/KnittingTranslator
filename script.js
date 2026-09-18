console.log("script.js Version 2026-07-03 8:36");

// ====================
// Globale Regeln
// ====================

let rulesRegex = [];
let rulesText = [];

// ====================
// Helper: Duplikate verhindern
// ====================

function addUsed(usedMap, entry) {
  let key;

  if (entry.rule === "smart-k" || entry.rule === "smart-p") {

    // Für k und p jeweils nur einen Legenden-Eintrag
    key = entry.rule;

    const newNum = parseInt(
      entry.input.match(/\d+/)?.[0] || "0",
      10
    );

    const existing = usedMap.get(key);

    // Noch kein Eintrag vorhanden
    if (!existing) {
      usedMap.set(key, entry);
      return;
    }

    const oldNum = parseInt(
      existing.input.match(/\d+/)?.[0] || "0",
      10
    );

    // Wenn beide Zahlen größer als 1 sind:
    // die kleinere Zahl behalten
    if (newNum > 1 && oldNum > 1) {
      if (newNum < oldNum) {
        usedMap.set(key, entry);
      }
      return;
    }

    // Eine Zahl > 1 ersetzt k1 bzw. p1
    if (newNum > 1 && oldNum === 1) {
      usedMap.set(key, entry);
    }

    return;
  }

  // Normale Regeln
  key =
    entry.input.toLowerCase().trim() + "|" +
    entry.output.toLowerCase().trim() + "|" +
    entry.meaning.toLowerCase().trim();

  if (!usedMap.has(key)) {
    usedMap.set(key, entry);
  }
}

// ====================
// Helper: Placeholder Resolver
// ====================

function resolve(str, groups) {
  return str.replace(
    /\$(\d+)/g,
    (_, i) => groups[i - 1] ?? ""
  );
}

// ====================
// Init
// ====================

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

  console.log("Regex:", rulesRegex.length);
  console.log("Text:", rulesText.length);
}

// ====================
// Parser
// ====================

function parseRules(text, isRegex) {

  return text
    .split("\n")
    .map(l => l.trim())
    .filter(
      l =>
        l &&
        !l.startsWith("#") &&
        l.includes("=")
    )
    .map(line => {

      const [pattern, rest] = line.split("=");

      let [repl, meaning] =
        (rest || "").split("|");

      return {
        id:
          pattern.trim() +
          "=" +
          repl.trim(),

        pattern: pattern.trim(),

        repl:
          (repl || "").trim(),

        meaning:
          (meaning || "").trim(),

        isRegex
      };
    })

    // längere/spezielle Regeln zuerst
    .sort(
      (a, b) =>
        b.pattern.length -
        a.pattern.length
    );
}

// ====================
// Regex Builder
// ====================

function buildRegex(rule) {

  try {

    if (rule.isRegex) {
      return new RegExp(
        rule.pattern,
        "gi"
      );
    }

    return new RegExp(
      "\\b" +
      rule.pattern.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      ) +
      "\\b",
      "gi"
    );

  } catch (e) {

    console.warn(
      "❌ Regex kaputt:",
      rule.pattern
    );

    return null;
  }
}

// ====================
// Regel anwenden
// ====================

function applyRule(
  text,
  rule,
  usedMap,
  regex
) {

  return text.replace(
    regex,
    (...args) => {

      const match = args[0];

      const groups =
        args.slice(1);

      const repl =
        resolve(
          rule.repl,
          groups
        );

      const meaning =
        resolve(
          rule.meaning,
          groups
        );

      if (rule.meaning) {

        addUsed(
          usedMap,
          {
            input: match,
            output: repl,
            meaning: meaning,
            rule: rule.id
          }
        );
      }

      return repl;
    }
  );
}

// ====================
// Smart Regeln (k2 / p2 usw.)
// ====================

function smartExpand(text, usedMap) {

  return text.replace(
    /(?<![\w-])([kp])(\d+)(?![\w-])/gi,
    (match, type, num) => {

      const n =
        parseInt(num, 10);

      const t =
        type.toLowerCase();

      let repl;
      let meaning;

      if (t === "k") {

        repl = `${n}re`;

        meaning =
          n === 1
            ? "1 Masche rechts stricken"
            : `${n} Maschen rechts stricken`;

      } else {

        repl = `${n}li`;

        meaning =
          n === 1
            ? "1 Masche links stricken"
            : `${n} Maschen links stricken`;
      }

      addUsed(
        usedMap,
        {
          input: `${t}${n}`,
          output: repl,
          meaning: meaning,
          rule: `smart-${t}`
        }
      );

      return repl;
    }
  );
}

// ====================
// Hauptfunktion
// ====================

function translateText() {

  console.count(
    "translateText"
  );

  let text =
    document.getElementById(
      "input"
    ).value;

  let used =
    new Map();

  if (!text) return;

  // ====================
  // 1. Regex Regeln
  // ====================

  for (
    let rule of rulesRegex
  ) {

    const regex =
      buildRegex(rule);

    if (
      !regex ||
      !text.match(regex)
    ) {
      continue;
    }

    text =
      applyRule(
        text,
        rule,
        used,
        regex
      );
  }

  // ====================
  // 2. Smart Regeln
  // ====================

  text =
    smartExpand(
      text,
      used
    );

  // ====================
  // 3. Text Regeln
  // ====================

  for (
    let rule of rulesText
  ) {

    const regex =
      buildRegex(rule);

    if (
      !regex ||
      !text.match(regex)
    ) {
      continue;
    }

    text =
      applyRule(
        text,
        rule,
        used,
        regex
      );
  }

  // ====================
  // Cleanup
  // ====================

  text =
    finalize(text);

  // ====================
  // Output
  // ====================

  let output =
    text;

  output +=
    "\n\n--- mini-Legende ---\n\n";

  console.log(
    [...used.values()]
  );

  output +=
    Array.from(
      used.values()
    )
      .map(u =>
        u.meaning
          ? `**${u.input} → ${u.output}** → ${u.meaning}    `
          : `**${u.input} → ${u.output}**    `
      )
      .join("\n");

  document.getElementById(
    "output"
  ).value = output;
}

// ====================
// Cleanup
// ====================

function finalize(text) {

  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(
      line =>
        "\t" +
        line.trim()
    )
    .join("\n");
}

// ====================
// UI
// ====================

function clearAll() {

  document.getElementById(
    "input"
  ).value = "";

  document.getElementById(
    "output"
  ).value = "";
}

function copyText() {

  navigator.clipboard.writeText(
    document.getElementById(
      "output"
    ).value
  );
}
