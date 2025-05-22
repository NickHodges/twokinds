import type { APIRoute } from 'astro';
import { getSayingById } from '../../lib/db-service';
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  console.debug('JSON endpoint GET invoked for id=', params.id);
  try {
    const id = parseInt(params.id || '', 10);
    console.log('JSON endpoint GET invoked for id=', id);
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

    const sentence = `${saying.introText} ${saying.typeName}: Those who ${saying.firstKind} and those who ${saying.secondKind}.`;
    const output = { ...saying, sentence };

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('JSON endpoint error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
