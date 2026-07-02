

text = text.replace(/\*/g, "§STAR§");

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
  const regex = new RegExp(rule.pattern, "g");

  return text.replace(regex, (...args) => {
    const match = args[0];
    const groups = args.slice(1);

    let repl = rule.repl.replace(/\$(\d+)/g, (_, i) => {
      return groups[i - 1] ?? "";
    });

    let meaning = rule.meaning.replace(/\$(\d+)/g, (_, i) => {
      return groups[i - 1] ?? "";
    });

    if (rule.meaning) {
      used.push({
        input: match,
        output: repl,
        meaning: meaning,
        rule: rule.pattern,
        rawRepl: rule.repl,
        rawMeaning: rule.meaning
      });
    }

    return repl;
  });
}


function translateText() {
  let text = document.getElementById("input").value;
  let used = [];

  for (let rule of rules) {
    const regex = new RegExp(rule.pattern, "g");

    let hasMatch = regex.test(text);
    regex.lastIndex = 0;

    if (hasMatch) {
      text = applyRule(text, rule, used);
    }
  }

  text = finalize(text);

  let output = text;

  if (used.length > 0) {
    output += "\n\n--- Verwendete Anweisungen ---\n\n";
    output += used
      .map(u => `${u.input} → ${u.output} → ${u.meaning}`)
      .join("\n");
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

text = text.replace(/§STAR§/g, "*");
