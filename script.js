
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

      return {
        pattern: patternPart.trim(),
        repl: repl.trim(),
        meaning: meaning ? meaning.trim() : ""
      };
    });

  console.log("Regeln geladen:", rules);
}

// automatisch beim Laden
loadRules(); 

function applyRule(text, rule, used) {
  const regex = new RegExp(rule.pattern, "gi");

  return text.replace(regex, function () {

    let match = arguments[0];

    // JS groups: arguments[1], arguments[2], ...
    let repl = rule.repl.replace(/\$(\d+)/g, function (_, i) {
      return arguments[parseInt(i)] || arguments[parseInt(i)] === 0
        ? arguments[parseInt(i)]
        : arguments.callee.caller.arguments[parseInt(i)] || "";
    });

    let meaning = rule.meaning.replace(/\$(\d+)/g, function (_, i) {
      return arguments.callee.caller.arguments[parseInt(i)] || "";
    });

    // Fallback (robust version)
    const groups = Array.from(arguments).slice(1);

    repl = rule.repl.replace(/\$(\d+)/g, (_, i) => groups[i - 1] ?? "");
    meaning = rule.meaning.replace(/\$(\d+)/g, (_, i) => groups[i - 1] ?? "");

    if (rule.meaning) {
      used.push(`${match} → ${repl} → ${meaning}`);
    }

    return repl;
  });
}


function translateText() {
  let text = document.getElementById("input").value;
  let used = [];

  rules.forEach(rule => {
    let regex = new RegExp(rule.pattern, "gi");

    let matches = [...text.matchAll(regex)];

    if (matches.length > 0 && rule.meaning) {
      matches.forEach(m => {
        used.push(`${m[0]} → ${rule.repl} → ${rule.meaning}`);
      });
    }

    text = text.replace(regex, rule.repl);
  });

  text = finalize(text);

  let output = text;

  if (used.length > 0) {
    output += "\n\n--- Verwendete Anweisungen ---\n\n";
    output += [...new Set(used)].join("\n");
  }

  document.getElementById("output").value = output;
}

function finalize(text) {
  return text
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
