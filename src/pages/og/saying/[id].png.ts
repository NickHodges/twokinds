import type { APIRoute } from 'astro';
import { createCanvas } from 'canvas';
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

  // Create a canvas
  const width = 1080;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background with border
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Main text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap the text
  const maxWidth = width - 200;
  const lineHeight = 68;
  const words = fullText.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Draw main text centered
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  // Footer text
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '32px sans-serif';
  ctx.fillText(siteDomain, width / 2, height - 100);

  // Convert to PNG buffer
  const buffer = canvas.toBuffer('image/png');

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const prerender = false;
