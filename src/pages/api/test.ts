import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, redirect }) => {
  console.log('API endpoint called!');
  
  try {
    const formData = await request.formData();
    const message = formData.get('message');
    console.log('API received message:', message);
    
    // Redirect back to test page with success parameter
    return redirect(`/test-action?success=true&message=${encodeURIComponent(String(message))}`);
  } catch (error) {
    console.error('API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process form' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};