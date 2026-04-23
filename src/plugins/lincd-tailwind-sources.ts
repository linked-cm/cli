//@ts-ignore
import plugin from 'tailwindcss/plugin';
import path from 'path';
import fs from 'fs';
import {
  getLINCDDependencies,
} from '../utils.js';


const getLincdSources = () => {
  // return plugin.withOptions(
  //   () => {},
  //   () => {
    const sources: string[] = [];

    // Always include your app source
    // sources.push('./src/**/*.{js,ts,tsx}');

    // Now dynamically add LINCD packages
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
    );

    const lincdDeps = getLINCDDependencies(packageJson);
    lincdDeps.forEach(([name, packagePath]) => {
      sources.push(`${packagePath}/lib/**/*.{js,ts,tsx,mjs}`);
    });

    // console.log('sources:', sources.join("\n"));

    return sources;
    // return {};
    // return {
    //   // Extend Tailwind's `content` config
    //   content: sources,
    // };
  // });
}
export default getLincdSources;