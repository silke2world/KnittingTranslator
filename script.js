let rules = [];

// 🔒 Button erst aktivieren wenn Regeln geladen sind
window.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById("translateBtn");
  if (btn) btn.disabled = true;

  await loadRules();

  if (btn) btn.disabled = false;
});

async function loadRules() {
  const response = await fetch("rules.txt");
  const text = await response.text();

  rules = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#") && line.includes("="))
    .map(line => {
      const [patternPart, rest] = line.split("=");
      let [repl, meaning] = (rest || "").split("|");

      if (!patternPart) return null;

      return {
        pattern: patternPart.trim(),
        repl: (repl || "").trim(),
        meaning: (meaning || "").trim(),
        isRegex: patternPart.includes("(")
      };
    })
    .filter(Boolean);

  // wichtig: spezifische Regeln zuerst
  rules.sort((a, b) => b.length - a.length);

  console.log("Regeln geladen:", rules);
}

function buildRegex(rule) {
  try {
    if (rule.isRegex) {
      return new RegExp(rule.pattern, "gi");
    }

    // 🔥 Wortgrenzen + case insensitive
    return new RegExp(
      "\\b" + rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
      "gi"
    );
  } catch (e) {
    console.warn("❌ Ungültige Regel:", rule.pattern);
    return null;
  }
}

function translateText() {
  let text = document.getElementById("input").value;

  if (!rules || rules.length === 0) {
    document.getElementById("output").value = "⚠️ Regeln noch nicht geladen";
    return;
  }

  let used = [];

  console.log("INPUT:", text);

  for (let rule of rules) {
    const regex = buildRegex(rule);
    if (!regex) continue;

    const hasMatch = text.match(regex);
    if (!hasMatch) continue;

    regex.lastIndex = 0;
    text = applyRule(text, rule, used, regex);
  }

  text = finalize(text);

  let output = text;

  if (used.length > 0) {
    output += "\n\n--- Verwendete Regeln ---\n\n";
    output += used.map(u => `${u.input} → ${u.output}`).join("\n");
  } else {
    output += "\n\n⚠️ Keine Regel hat gegriffen";
  }

  document.getElementById("output").value = output;
}

function finalize(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}

function copyText() {
  const text = document.getElementById("output").value;
  navigator.clipboard.writeText(text);
}

function clearAll() {
  console.log("CLEAR CLICKED");

  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
}
