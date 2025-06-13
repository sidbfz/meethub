"use client";

import { useEffect, useState } from "react";

export default function ToasterProvider() {
  const [ToasterComponent, setToasterComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("react-hot-toast").then((hotToast) => {
      setToasterComponent(() => hotToast.Toaster);
    });
  }, []);

  if (!ToasterComponent) return null;

  return (
    <ToasterComponent 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
      }}
    />
  );
}
