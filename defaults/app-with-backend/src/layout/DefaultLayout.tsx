import React from 'react';
import { Header } from './Header';
import style from './DefaultLayout.module.css';

export function DefaultLayout({ children }) {
  return (
    <main className={style.main}>
      <Header />
      {children}
    </main>
  );
}
