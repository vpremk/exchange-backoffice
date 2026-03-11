// SPDX-License-Identifier: Apache-2.0
// Copyright 2025 Compliance Sentinel Contributors

const express = require('express');
const hello = require('./routes/hello');

const app = express();
const PORT = process.env.PORT || 3002;

app.use('/hello', hello);

app.get('/', (req, res) => {
  res.send('Agentic Team App is running');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
