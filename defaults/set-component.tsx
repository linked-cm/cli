import React from "react";
import "./${hyphen_name}.scss";
import {default as style} from "./${hyphen_name}.scss.json";
import {linkedSetComponent} from '../package';

//TODO: replace SHAPE with an actual Shape class
export const ${camel_name} = linkedSetComponent<SHAPE>(SHAPE,({sources}) => {
  return <div className={style.${camel_name}}>
    {sources.map(source => {
      return <div key={source.toString()}></div>;
    })}
  </div>;
});