/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_STAKE_ARENA_ADDRESS?: string;
  readonly VITE_BASE_SEPOLIA_STAKE_ARENA_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

