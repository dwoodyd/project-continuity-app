import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Continuary-themed Toaster.
 * Uses dark theme hardcoded to match the app palette.
 * CSS variables set the navy-gradient card, gold hairline, and Inter typography.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      gap={10}
      toastOptions={{
        style: {
          background: "linear-gradient(160deg,#16223A,#101A2E)",
          border: "1px solid rgba(217,164,65,0.30)",
          borderRadius: "12px",
          color: "#E6E9EF",
          boxShadow: "0 12px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.2)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "13.5px",
        },
        classNames: {
          title: "cy-toast-title",
          description: "cy-toast-desc",
          actionButton: "cy-toast-action",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
