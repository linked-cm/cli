declare module '*.css' {
  const styles: {
    readonly [key: string]: string;
  };
  // export type ClassName = string;
  export default styles;
}
declare module '*.scss' {
  const styles: {
    readonly [key: string]: string;
  };
  // export type ClassName = string;
  export default styles;
}
