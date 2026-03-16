// Parallel route slot default: renders nothing for routes other than /
// Required by Next.js 16 when cacheComponents: true to prevent 404 on hard navigation
export default function Default() {
  return null;
}
