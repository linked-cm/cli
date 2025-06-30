import React from 'react';
import { DefaultLayout } from '../layout/DefaultLayout';
import style from './Home.module.css';

export default function Home() {
  return (
    <DefaultLayout>
      <div className={style.Home}>
        <h2>Get started</h2>
        <p>
          Your LINCD App is ready to go!
          <br />
          To edit this file, open:
        </p>
        <code>
          <pre>/src/pages/Home.tsx</pre>
        </code>
      </div>
    </DefaultLayout>
  );
}
