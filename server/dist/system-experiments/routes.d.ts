/// <reference types="node" />
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
/**
 * Wires the System Experiments endpoints onto an existing express app +
 * http server.
 *
 *   POST {prefix}/primary     — apply Primary form payload
 *   POST {prefix}/secondary   — apply Secondary form payload
 *   GET  {prefix}/get         — current full state (seed for the front-end)
 *   WS   {prefix}/ws          — broadcasts state after every POST
 *
 * WS co-existence: `noServer: true` + a scoped `upgrade` listener that only
 * claims our path, so this WSS shares the HTTP server with the existing
 * `/api/ws` WSS without conflict.
 */
export declare function registerSystemExperimentsRoutes(app: Express, server: HttpServer): void;
