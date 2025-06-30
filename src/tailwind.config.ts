import getLincdSources from './plugins/lincd-tailwind-sources';
// console.log('✅ Loaded tailwind.config.js');
const config = {
  content: [
    './src/**/*.{js,ts,tsx}',
    ...getLincdSources(),
  ],
  theme: {
    extend: {},
  },
};

export default config;