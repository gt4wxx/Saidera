const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname);
const port = process.env.PORT || 5173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const rel = (url === "/" ? "index.html" : url).replace(/^\/+/, "");
    let file = path.resolve(root, rel);
    const rootAbs = path.resolve(root);
    if (file !== rootAbs && !file.startsWith(rootAbs + path.sep)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (e, data) => {
        if (e) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          return res.end("Não encontrado");
        }
        const ext = path.extname(file).toLowerCase();
        const headers = { "Content-Type": types[ext] || "application/octet-stream" };
        if (path.basename(file) === "sw.js") {
          headers["Service-Worker-Allowed"] = "/";
          headers["Cache-Control"] = "no-cache";
        }
        if (ext === ".webmanifest") headers["Cache-Control"] = "no-cache";
        res.writeHead(200, headers);
        res.end(data);
      });
    });
  })
  .listen(port, () => {
    console.log(`Saideira demo → http://localhost:${port}`);
  });
