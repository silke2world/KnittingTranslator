
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


function translateText() {
  let text = document.getElementById("input").value;

  let used = [];

  rules.forEach(rule => {
    let regex = new RegExp(rule.pattern, "gi");

    if (regex.test(text)) {
      if (rule.meaning) {
        used.push(rule.meaning);
      }
    }

    text = text.replace(regex, rule.repl);
  });

  text = finalize(text);

  document.getElementById("output").value = text;
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
