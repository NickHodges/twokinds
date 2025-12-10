import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import { getSayingById } from '../../../lib/db-service';

// Get site domain from Astro config (via import.meta.env.SITE)
const siteUrl = import.meta.env.SITE || 'https://twokindsof.com';
const siteDomain = new URL(siteUrl).hostname;

export const GET: APIRoute = async ({ params }) => {
  // Get the saying ID from params
  const sayingId = parseInt(params.id || '0');

  // Fetch the saying data
  const sayingData = await getSayingById(sayingId);

  if (!sayingData) {
    return new Response('Saying not found', { status: 404 });
  }

  const saying = {
    introText: sayingData.introText || '',
    firstKind: sayingData.firstKind,
    secondKind: sayingData.secondKind,
    pronoun: sayingData.pronoun || 'who',
    typeName: sayingData.typeName || '',
  };

  // Build the full saying text including intro, category, and kinds
  const introText = saying.introText || 'There are two kinds of';
  const categoryText = `${introText} ${saying.typeName}`;
  const fullText = `${categoryText} — those ${saying.pronoun} ${saying.firstKind} and those ${saying.pronoun} ${saying.secondKind}.`;

  return new ImageResponse(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#18181b',
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: '60px',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                bottom: '10px',
                border: '20px solid #3f3f46',
                borderRadius: '0',
              },
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                textAlign: 'center',
                padding: '0 100px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '52px',
                      fontWeight: 'bold',
                      color: '#ffffff',
                      lineHeight: 1.3,
                      wordWrap: 'break-word',
                    },
                    children: fullText,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '100px',
                fontSize: '32px',
                color: '#a1a1aa',
              },
              children: siteDomain,
            },
          },
        ],
      },
    },
    {
      width: 1080,
      height: 1080,
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
};

export const prerender = false;
