import React from 'react';
import {Header} from './Header';
import './DefaultLayout.scss';
import style from './DefaultLayout.scss.json';

export function DefaultLayout({children}) {
  return (
    <main className={style.main}>
      <Header />
      {children}
    </main>
  );
}
