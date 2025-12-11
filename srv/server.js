const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

cds.on('bootstrap', app => {
    // Serve static files from the 'app' directory
    const appDir = path.join(__dirname, 'app');
    app.use('/', express.static(appDir));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/error-service') || req.path.startsWith('/$')) {
            return next();
        }
        res.sendFile(path.join(appDir, 'index.html'));
    });
});

module.exports = cds.server;
