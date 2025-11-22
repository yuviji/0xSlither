/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAME_TOKEN_ADDRESS?: string;
  readonly VITE_STAKE_ARENA_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

