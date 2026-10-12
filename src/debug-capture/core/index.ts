/**
 * L2 core barrel — pure logic (recorder, policy, serializer, clock), no globals.
 * May import only the contract barrel; re-exports it so the layer below needs
 * a single import path.
 */
export * from '../contract';
