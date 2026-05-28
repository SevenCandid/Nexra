export default async function handler(request, response) {
  // Replace with your actual Render backend URL
  const RENDER_BACKEND_URL = 'https://nexra-api.onrender.com/';

  try {
    const start = Date.now();
    const res = await fetch(RENDER_BACKEND_URL);
    const duration = Date.now() - start;

    if (res.ok) {
      return response.status(200).json({
        success: true,
        message: `Successfully pinged Render app!`,
        duration_ms: duration,
        status_code: res.status,
        timestamp: new Date().toISOString()
      });
    } else {
      return response.status(res.status).json({
        success: false,
        message: `Render server responded with status: ${res.status}`,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: `Failed to ping Render app: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
