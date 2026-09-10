import type {NodeReferenceValue} from '@_linked/core/utils/NodeReference';
import {createNameSpace} from '@_linked/core/utils/NameSpace';
import {linkedOntology} from '../package.js';
//import all the exports of this file as one variable called _this (we need this at the end)
import * as _this from './${hyphen_name}.js';

/**
 * Load the data of this ontology into memory, thus adding the properties of the entities of this ontology to the local graph.
 */
export var loadData = () => {
  if (typeof module !== 'undefined' && typeof exports !== 'undefined') {
    // CommonJS import
    return import('../data/${hyphen_name}.json');
  } else {
    // ESM import
    //@ts-ignore
    return import('../data/${hyphen_name}.json',{ with: { type: "json" } }).then((data) => data.defauilt);
  }
};

/**
 * The namespace of this ontology, which can be used to create NamedNodes with IRIs not listed in this file
 */
export var ns = createNameSpace('${uri_base}');

/**
 * A reference to the ontology itself.
 */
export var _self: NodeReferenceValue = ns('');

//Every class and property of this ontology, each exported as a node reference.
// export var ExampleClass: NodeReferenceValue = ns('ExampleClass');
// export var exampleProperty: NodeReferenceValue = ns('exampleProperty');

//An extra grouping object so all the entities can be accessed from the prefix/name
export const ${camel_name} = {
  // ExampleClass,
  // exampleProperty,
};

//Registers this ontology to LINCD.JS, so that data loading can be automated amongst other things
linkedOntology(_this, ns, '${hyphen_name}', loadData, '../data/${hyphen_name}.json');
