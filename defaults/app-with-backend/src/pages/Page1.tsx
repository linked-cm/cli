import { DefaultLayout } from '../layout/DefaultLayout';
import style from './Page1.module.css';

export default function Page1() {
  return (
    <DefaultLayout>
      <div className={style.Card}>
        <h2>Page 1</h2>
        <p>
          A second route to show how navigation works. Edit{' '}
          <code>src/pages/Page1.tsx</code> to make this your own.
        </p>
      </div>
    </DefaultLayout>
  );
}
