import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@fulad/shared', '@fulad/ui-tokens'],
};

export default config;
