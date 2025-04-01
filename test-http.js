import fetch from 'node-fetch';

const TURSO_URL = 'https://twokinds-navynudge.turso.io';
const TURSO_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDIyOTE5NDAsImlkIjoiYTQwODA2NDAtNjE0Yy00ZmNmLWI4ODYtYTA1ODQ1ODM4ZGU5IiwicmlkIjoiYTRhMzE4YTEtNDEwNC00YjA2LWE1NjgtMzYzZWUwMzBjOTQ1In0.RdwH0FAS5udr7vGbcYQNqMP6z-XyH8Gf8zhk2bHKvIfPyPu_jb48gAOiRoatRhI5CUCqrxNqpLqd8k1E5omgCg';

async function testConnection() {
  try {
    const response = await fetch(`${TURSO_URL}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'SELECT 1',
      }),
    });

    if (!response.ok) {
      console.error('Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    console.log('Connection successful!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
