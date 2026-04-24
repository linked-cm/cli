import getLincdSources from './plugins/lincd-tailwind-sources.js';
// console.log('✅ Loaded tailwind.config.js');

// This config is used via @config directive in theme.css
// It provides content paths for Tailwind class detection
const config = {
  content: ['./src/**/*.{js,ts,tsx}', ...getLincdSources()],
  theme: {
    extend: {},
  },
};

export default config;
