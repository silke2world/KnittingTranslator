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

      const isRegex = patternPart.includes("("); // stabiler als vorher

      return {
        pattern: patternPart.trim(),
        repl: (repl || "").trim(),
        meaning: (meaning || "").trim(),
        isRegex,
        length: patternPart.length
      };
    });

  // wichtig: spezifische Regeln zuerst
  rules.sort((a, b) => b.length - a.length);

  console.log("Regeln geladen:", rules);
}

function buildRegex(rule) {
  if (rule.isRegex) {
    try {
      return new RegExp(rule.pattern, "g");
    } catch (e) {
      console.warn("Ungültige Regex-Regel:", rule.pattern);
      return null;
    }
  }

  return new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
}

function applyRule(text, rule, used, regex) {
  return text.replace(regex, (...args) => {
    const match = args[0];
    const groups = args.slice(1);

    let repl = rule.repl.replace(/\$(\d+)/g, (_, i) => groups[i - 1] ?? "");
    let meaning = rule.meaning.replace(/\$(\d+)/g, (_, i) => groups[i - 1] ?? "");

    if (rule.meaning) {
      used.push({
        input: match,
        output: repl,
        meaning,
        rule: rule.pattern
      });
    }

    return repl;
  });
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
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
}
