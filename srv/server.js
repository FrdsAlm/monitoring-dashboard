const cds = require('@sap/cds');
const express = require('express');
const path = require('path');
const fs = require('fs');

cds.on('bootstrap', app => {
    const appDir = path.join(__dirname, 'app');

    // Only serve static files if app/ exists (production build)
    if (fs.existsSync(appDir)) {
        app.use('/', express.static(appDir));

        // SPA fallback for client-side routes
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') ||
                req.path.startsWith('/$') ||
                req.path.startsWith('/@') ||
                req.path.includes('.')) {
                return next();
            }
            res.sendFile(path.join(appDir, 'index.html'));
        });
    }
});

module.exports = cds.server;
