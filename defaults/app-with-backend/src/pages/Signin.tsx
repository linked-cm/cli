import { DefaultLayout } from '../layout/DefaultLayout';
import style from './Signin.module.css';

export default function Signin() {
  return (
    <DefaultLayout>
      <div className={style.Card}>
        <h2>Sign in</h2>
        <p>
          See <a href="https://linked.cm">linked.cm</a> for different ways to
          sign in.
        </p>
      </div>
    </DefaultLayout>
  );
}
