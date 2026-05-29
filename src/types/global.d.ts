/// <reference types="react" />
/// <reference types="react-dom" />

declare module "react" {
  export = React;
  export as namespace React;
}

declare module "react-dom" {
  export = ReactDOM;
  export as namespace ReactDOM;
}

declare module "react-hot-toast" {
  export = toast;
  export as namespace toast;
}
