declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": {
      src?: string;
      "camera-controls"?: boolean | string;
      "auto-rotate"?: boolean | string;
      "shadow-intensity"?: string;
      "environment-image"?: string;
      exposure?: string;
      ar?: boolean | string;
      style?: React.CSSProperties;
      className?: string;
      children?: React.ReactNode;
    };
  }
}
