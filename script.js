let rules = [];

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

async function loadRules() {
  try {
    const response = await fetch("rules.txt");
    const text = await response.text();

    rules = text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const [patternPart, rest] = line.split("=");
        let [repl, meaning] = (rest || "").split("|");

        return {
          pattern: patternPart.trim(),
          repl: (repl || "").trim(),
          meaning: (meaning || "").trim(),
          isRegex: patternPart.includes("(")
        };
      })
      .filter(Boolean);

    rules.sort((a, b) => b.pattern.length - a.pattern.length);

    console.log("Regeln geladen:", rules);
  } catch (e) {
    console.error("Fehler beim Laden der Regeln:", e);
  }
}

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
    console.warn("Ungültige Regel:", rule.pattern);
    return null;
  }
}

function applyRule(text, rule, used, regex) {
  return text.replace(regex, (...args) => {
    const match = args[0];
    const groups = args.slice(1);

    let repl = rule.repl.replace(/\$(\d+)/g, (_, i) => groups[i - 1] ?? "");

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

function translateText() {
  let text = document.getElementById("input").value;

  let used = [];

  // 🔥 zuerst intelligente Regeln
  text = smartExpand(text, used);

  for (let rule of rules) {
    const regex = buildRegex(rule);
    if (!regex) continue;

    if (!text.match(regex)) continue;

    text = applyRule(text, rule, used, regex);
  }

  text = finalize(text);

  let output = text;

  output += "\n\n--- Verwendete Regeln ---\n\n";
  output += used.map(u => `${u.input} → ${u.output}`).join("\n");

  document.getElementById("output").value = output;
}


function finalize(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}

function clearAll() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
}

function copyText() {
  navigator.clipboard.writeText(
    document.getElementById("output").value
  );
}
