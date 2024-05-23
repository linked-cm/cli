import React from "react";
import "./${hyphen_name}.scss";
import {default as style} from "./${hyphen_name}.scss.json";
import {linkedComponent} from '../package';

//TODO: replace SHAPE with an actual Shape class
export const ${camel_name} = linkedComponent<SHAPE>(SHAPE,({source}) => {
  return <div className={style.${camel_name}}></div>;
});

