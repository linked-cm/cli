import {Link} from 'react-router-dom';
import React from 'react';
import style from './Header.scss.json';
import './Header.scss';
import {ROUTES} from '../routes';

export function Header() {
  return (
    <header className={style.header}>
      <h1>${name}</h1>
      <nav className={style.menu}>
        {Object.keys(ROUTES).map((key) => {
          if (ROUTES[key].excludeFromMenu) return null;
          return (
            <Link key={key} to={ROUTES[key].path}>
              {ROUTES[key].label || key}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
