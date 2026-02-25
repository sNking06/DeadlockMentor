const path = require("path");
const express = require("express");

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendRoot = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendRoot));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendRoot, "index.html"));
});

app.listen(port, () => {
  console.log(`Deadlock Mentor (frontend-only) en ligne sur http://localhost:${port}`);
});
