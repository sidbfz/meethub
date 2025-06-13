declare module "react-hot-toast" {
  import { ReactNode } from "react";

  interface ToastOptions {
    duration?: number;
    style?: React.CSSProperties;
    className?: string;
    position?: 
      | "top-left"
      | "top-center" 
      | "top-right"
      | "bottom-left"  
      | "bottom-center"
      | "bottom-right";
  }

  interface ToasterProps {
    position?: ToastOptions["position"];
    toastOptions?: ToastOptions;
    gutter?: number;
    containerClassName?: string;
    containerStyle?: React.CSSProperties;
  }

  function toast(message: string, options?: ToastOptions): string;
  
  namespace toast {
    function success(message: string, options?: ToastOptions): string;
    function error(message: string, options?: ToastOptions): string;
    function loading(message: string, options?: ToastOptions): string;
    function dismiss(toastId?: string): void;
  }

  export function Toaster(props?: ToasterProps): JSX.Element;
  export default toast;
}
