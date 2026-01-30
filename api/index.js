/**
 * Entry point para Vercel Serverless.
 * Redirige todas las peticiones al app Express compilado.
 */
module.exports = require('../dist/index').default;
