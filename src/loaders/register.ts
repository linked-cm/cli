import { register } from 'node:module';
//@ts-ignore
import { register as tsx } from 'tsx/esm/api';

//first register our hooks before TSX
//@ts-ignore
register('./css-loader.mjs', import.meta.url);

//then register TXS
tsx();