import React from 'react';
import style from './Spinner.module.css';

export function Spinner({ active = true }) {
  return (
    <div
      className={[style.spinner, active && style.active].join(' ')}
      role="progressbar"
      aria-busy={active ? 'true' : 'false'}
    />
  );
}
