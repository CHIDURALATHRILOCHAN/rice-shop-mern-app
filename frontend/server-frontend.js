const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Render will provide PORT, fallback to 3000 locally

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// For any other route, serve the index.html file
// This handles client-side routing (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
});