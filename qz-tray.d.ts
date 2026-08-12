// qz-tray no publica tipos TypeScript. Lo declaramos como `any` para poder importarlo
// dinámicamente (import('qz-tray')) sin que tsc falle. La API se usa vía el wrapper
// services/cashDrawer.ts.
declare module 'qz-tray';
declare module 'jsbarcode';
