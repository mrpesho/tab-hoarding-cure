import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Tab Hoarding Cure',
    description: 'Filter and manage open tabs - close, discard, or move them',
    permissions: ['tabs'],
  },
});
