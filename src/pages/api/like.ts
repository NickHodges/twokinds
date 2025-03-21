import type { APIRoute } from 'astro';

// Now using Astro Actions, this endpoint is deprecated
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This endpoint is deprecated. Please use Astro Actions instead.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

// Redirect POST requests to the Astro Action
export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the request body
    const body = await request.json();
    const { sayingId, action } = body;

    // Construct form data
    const formData = new FormData();
    formData.append('sayingId', sayingId.toString());
    if (action) {
      formData.append('action', action);
    }

    // Forward to the Astro Action handler (will be handled by the toggleLike action)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'This endpoint is deprecated. Please use Astro Actions directly.',
        action: action || 'toggle',
        sayingId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in like API:', error);
    return new Response(
      JSON.stringify({
        error: 'This endpoint is deprecated. Please use Astro Actions instead.',
      }),
      {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
