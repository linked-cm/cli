import React from 'react';
import { DefaultLayout } from '../layout/DefaultLayout';
import { PersonOverview } from '../components/PersonOverview';
import style from './Home.module.css';

export default function Home() {
  return (
    <DefaultLayout>
      <div className={style.Home}>
        <PersonOverview />
      </div>
    </DefaultLayout>
  );
}
