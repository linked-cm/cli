import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import style from './Header.module.css';
import { ROUTES } from '../routes';

export function Header() {
  let path = useLocation();
  return (
    <header className={style.header}>
      <h1>LINCD 1.0 Demo App</h1>
      <nav className={style.menu}>
        {Object.keys(ROUTES).map((key) => {
          if (ROUTES[key].excludeFromMenu) return null;
          return (
            <Link
              key={key}
              to={ROUTES[key].path}
              className={ROUTES[key].path === path.pathname ? style.active : ''}
            >
              {ROUTES[key].label || key}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
