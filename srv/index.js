const cds = require('@sap/cds');
const { randomUUID } = require('crypto');

module.exports = cds.service.impl(function () {
  const { ErrorLogs } = this.entities;

  this.before('CREATE', ErrorLogs, (req) => {
    if (!req.data.ID) req.data.ID = randomUUID();
    if (!req.data.timestamp) req.data.timestamp = new Date();
  });
});
