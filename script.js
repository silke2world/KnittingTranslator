function translateText() {
  let text = document.getElementById("input").value;

  // einfache Regeln (später erweiterbar wie deine rules.txt)
  text = text.replace(/\bk(\d+)tog\b/gi, "$1 M. re zus.");
  text = text.replace(/\bp(\d+)tog\b/gi, "$1 M. li zus.");
  text = text.replace(/\bk(\d+)\b/gi, "$1 re M.");
  text = text.replace(/\bp(\d+)\b/gi, "$1 li M.");

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
