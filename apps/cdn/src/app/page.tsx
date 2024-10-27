export default function CDNPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">OpenPreview CDN</h1>
      <ul className="list-disc pl-5">
        <li>Serves the OpenPreview script (opv3.js)</li>
        <li>Optimized for fast content delivery</li>
        <li>Supports versioning for script updates</li>
        <li>Implements caching strategies for improved performance</li>
        <li>Provides CORS headers for cross-origin access</li>
        <li>Logs usage statistics for monitoring</li>
      </ul>
    </div>
  );
}
