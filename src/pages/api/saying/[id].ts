// Removed unused APIRoute import

import { getSayingById } from '../../../lib/db-service';

export async function GET({ params }: { params: Record<string, string> }) {
  const id = parseInt(params.id || '', 10);
  if (!id || !Number.isFinite(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const saying = await getSayingById(id);
  if (!saying) {
    return new Response(JSON.stringify({ error: 'Saying not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(saying), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
