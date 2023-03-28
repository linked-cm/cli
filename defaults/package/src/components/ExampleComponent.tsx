import React from "react";
import {ExampleShapeClass} from "../shapes/ExampleShapeClass";
import {linkedComponent} from '../package';

export const ExampleComponent = linkedComponent<ExampleShapeClass>(ExampleShapeClass, ({source}) => {
  //note that typescript knows that 'source' is an instance of the Shape you linked this component to
  return <div></div>;
});
