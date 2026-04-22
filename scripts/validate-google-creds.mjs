// Validate Google OAuth credentials are set and non-empty
const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
if (!id || id.trim() === "") {
  console.error("GOOGLE_CLIENT_ID is empty or not set");
  process.exit(1);
}
if (!secret || secret.trim() === "") {
  console.error("GOOGLE_CLIENT_SECRET is empty or not set");
  process.exit(1);
}
console.log("GOOGLE_CLIENT_ID set:", id.slice(0, 8) + "...");
console.log("GOOGLE_CLIENT_SECRET set: yes");
console.log("Credentials look valid.");
