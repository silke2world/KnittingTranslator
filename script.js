


let rules = [];

async function loadRules() {
  const response = await fetch("rules.txt");
  const text = await response.text();

  rules = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#") && line.includes("="))
    .map(line => {
      const [patternPart, rest] = line.split("=");
      let [repl, meaning] = rest.split("|");

      const isRegex = /[()\\[\\].+*?^$|]/.test(patternPart);

      return {
        pattern: patternPart.trim(),
        repl: (repl || "").trim(),
        meaning: (meaning || "").trim(),
        isRegex,
        length: patternPart.length
      };
    });

  // 🔥 wichtig: längere / spezifischere Regeln zuerst
  rules.sort((a, b) => b.length - a.length);

  console.log("Regeln geladen:", rules);
}


// automatisch beim Laden
loadRules();


function applyRule(text, rule, used) {
  const regex = buildRegex(rule);
  if (!regex) return text;

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
  let used = [];

  console.log("INPUT:", text);

  for (let rule of rules) {
    const regex = buildRegex(rule);
    if (!regex) continue;

    if (regex.test(text)) {
      regex.lastIndex = 0;
      text = applyRule(text, rule, used);
    }
  }

  text = finalize(text);

  let output = text;

  if (used.length > 0) {
    output += "\n\n--- Verwendete Regeln ---\n\n";
    output += used
      .map(u => `${u.input} → ${u.output}`)
      .join("\n");
  } else {
    output += "\n\n⚠️ Keine Regel hat gegriffen";
  }

  document.getElementById("output").value = output;
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

  // Plain text → sicher escapen
  return new RegExp(rule.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
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

