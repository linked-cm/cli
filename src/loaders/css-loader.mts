import createLoader from 'create-esm-loader'
// import parseCSS from 'css-parse';
import { generateScopedName,generateScopedNameProduction } from '../utils.js';

const cssLoader = {
  resolve(specifier, opts) {
    if (specifier.endsWith('.css') || specifier.endsWith('.scss')) {
      let { parentURL } = opts;
      let url = new URL(specifier, parentURL).href;
      return { url };
    }
  },
  format(url, opts) {
    if (url.endsWith('.css') || url.endsWith('.scss')) {
      return { format: 'module' };
    }
  },
  transform(source, opts) {
    const { url } = opts
    if (url.endsWith('.css') || url.endsWith('.scss')) {

      // const { outputText } = ts.transpileModule(String(source), {
      //   compilerOptions: {
      //     module: ts.ModuleKind.ES2020,
      //   },
      // })
      let cssClassesObject = parseCssToObject(String(source),opts.url);
      let finalSource = JSON.stringify(cssClassesObject,null,2);
      return { source: `export default ${finalSource};`};
    }
  },
};

function parseCssToObject(rawSource:string,filename) {
  const output = {};
  //TODO: replace with parse scss
  let myResults = rawSource.match(/\.[a-zA-Z_]{1}[\w]+[\s:]/g);
  if(myResults) {
    myResults.map(result => {
      return result.replace(/[\.\s:]/g,'')
    }).forEach(selector => {
      let scopedClassName;
      if(process.env.NODE_ENV === 'production') {
        scopedClassName = generateScopedNameProduction(selector,filename);
      } else {
        scopedClassName = generateScopedName(selector,filename);
      }
      output[selector] = scopedClassName;
    })
  }
  // console.log(myResults);
  // for (const rule of parseCSS(rawSource).stylesheet.rules) {
  //   if(rule.selectors)
  //   {
  //     let selector = rule['selectors'].at(-1); // Get right-most in the selector rule: `.Bar` in `.Foo > .Bar {…}`
  //     if (selector[0] !== '.') break; // only care about classes
  //
  //     selector = selector
  //       .substring(1) // Skip the initial `.`
  //       .match(/(\w+)/)[1]; // Get only the classname: `Qux` in `.Qux[type="number"]`
  //
  //     output[selector] = selector;//getClassStyles(rule['declarations']);
  //     // : selector;
  //   }
  // }

  return output;
}

function getClassStyles(declarations) {
  const styles = {};

  for (const declaration of declarations) {
    styles[declaration['property']] = declaration['value'];
  }

  return styles;
}
//@ts-ignore
export const { resolve, load } = await createLoader(cssLoader);