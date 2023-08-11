import {Link} from 'react-router-dom';
import React from 'react';
import style from './Header.scss.json';
import './Header.scss';

export function Header() {
  return (
    <header className={style.header}>
      <h1>${name}</h1>
      <nav className={style.menu}>
        <Link to="/">Home</Link>
        <Link to="/page1">Page 1</Link>
      </nav>
    </header>
  );
}
