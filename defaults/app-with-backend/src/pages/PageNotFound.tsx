import React from 'react';
import { DefaultLayout } from '../layout/DefaultLayout';
import style from './PageNotFound.module.css';

export default function PageNotFound() {
  return (
    <DefaultLayout>
      <div className={style.Card}>
        <h2>Page not found</h2>
        <p>The page you were looking for does not exist.</p>
      </div>
    </DefaultLayout>
  );
}
