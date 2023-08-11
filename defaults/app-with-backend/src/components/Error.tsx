import React from 'react';
import style from './Error.scss.json';
import './Error.scss';

export function Error({error}) {
  return (
    <div className={style.error}>
      <h1>Application Error</h1>
      <pre>{error.stack}</pre>
    </div>
  );
}

