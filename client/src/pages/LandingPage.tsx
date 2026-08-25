import WelcomePage from "./WelcomePage";

/**
 * /landing stays inside Continuary so a visitor's persisted light/dark choice
 * never changes merely because they followed a different public URL.
 */
export default function LandingPage() {
  return <WelcomePage />;
}
