/**
 * HOOSHYAR ENERGY SOURCE GATEWAY — SERVER ENTRY POINT
 * Stage 13.10.2-C2C: Standalone Gateway Service Implementation
 * 
 * Standalone executable entry point for the isolated Iran-side Gateway service.
 */

import { createGatewayApp } from './app.js';
import { loadGatewayConfig } from './config.js';

function startGatewayServer() {
  const config = loadGatewayConfig();
  const app = createGatewayApp();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(JSON.stringify({
      level: 'info',
      event: 'GATEWAY_SERVICE_STARTED',
      service: 'hooshyar-energy-source-gateway',
      port: config.port,
      nodeEnv: config.nodeEnv,
      gatewayId: config.gatewayId,
      protocolVersion: '1.0'
    }));
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Shutting down gateway gracefully...`);
    server.close(() => {
      console.log('Gateway server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

if (process.env.RUN_STANDALONE_GATEWAY === 'true') {
  startGatewayServer();
}
