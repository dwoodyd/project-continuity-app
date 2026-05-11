import { useEffect } from "react";

/**
 * /landing — Priority 5 redirect.
 *
 * The canonical marketing surface is continuary.app (the public marketing site).
 * This route now redirects there immediately, preserving any ?code= invite param
 * so that invite links like /landing?code=XXXX still work correctly.
 */
export default function LandingPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    const dest = codeParam
      ? `https://continuary.app/?code=${encodeURIComponent(codeParam)}`
      : "https://continuary.app/";
    window.location.replace(dest);
  }, []);

  // Render nothing while the redirect fires
  return null;
}
