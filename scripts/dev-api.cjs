/**
 * Start Django dev server using project .venv when present, else python3/python on PATH.
 * Works on macOS/Linux (.venv/bin/python) and Windows (.venv\Scripts\python.exe).
 */
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const backend = path.join(root, "backend")

const candidates = [
  path.join(root, ".venv", "bin", "python"),
  path.join(root, ".venv", "Scripts", "python.exe"),
  "python3",
  "python",
]

function pickPython() {
  for (const c of candidates) {
    if (c === "python3" || c === "python") return c
    if (fs.existsSync(c)) return c
  }
  console.error(
    "No Python found. Create a venv from the repo root:\n" +
      "  python3 -m venv .venv\n" +
      "  .venv/bin/pip install -r backend/requirements.txt   # Windows: .venv\\Scripts\\pip ...\n"
  )
  process.exit(1)
}

const py = pickPython()
const child = spawn(py, ["manage.py", "runserver", "127.0.0.1:8000"], {
  cwd: backend,
  stdio: "inherit",
  shell: false,
})
child.on("exit", (code) => process.exit(code ?? 1))
