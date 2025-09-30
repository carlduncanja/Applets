import { NextRequest, NextResponse } from 'next/server';

/**
 * Universal utility endpoint for applets
 * Supports: proxy requests, API calls, data fetching, file operations
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();
    
    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'fetch':
        return await handleFetch(params);
      
      case 'proxy':
        return await handleProxy(params);
      
      case 'scrape':
        return await handleScrape(params);
      
      case 'download':
        return await handleDownload(params);
      
      case 'convert':
        return await handleConvert(params);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Utility endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute action' },
      { status: 500 }
    );
  }
}

// Fetch any URL and return JSON/text
async function handleFetch(params: any) {
  const { url, method = 'GET', headers = {}, body } = params;
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-OS/1.0)',
        ...headers
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return NextResponse.json({
      success: true,
      data,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Fetch failed' },
      { status: 500 }
    );
  }
}

// Proxy HTML content (bypass CORS)
async function handleProxy(params: any) {
  const { url } = params;
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-OS/1.0)',
      },
    });

    const html = await response.text();
    
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Proxy failed' },
      { status: 500 }
    );
  }
}

// Scrape and parse HTML (extract specific data)
async function handleScrape(params: any) {
  const { url, selector } = params;
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-OS/1.0)',
      },
    });

    const html = await response.text();
    
    // Return raw HTML - client can parse it
    return NextResponse.json({
      success: true,
      html,
      length: html.length,
      url
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Scrape failed' },
      { status: 500 }
    );
  }
}

// Download file/content
async function handleDownload(params: any) {
  const { url } = params;
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const blob = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Download failed' },
      { status: 500 }
    );
  }
}

// Convert data formats
async function handleConvert(params: any) {
  const { from, to, data } = params;
  
  if (!from || !to || !data) {
    return NextResponse.json(
      { error: 'from, to, and data are required' },
      { status: 400 }
    );
  }

  try {
    let result;

    // JSON to CSV
    if (from === 'json' && to === 'csv') {
      const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
      const array = Array.isArray(jsonData) ? jsonData : [jsonData];
      const keys = Object.keys(array[0] || {});
      const csv = [
        keys.join(','),
        ...array.map(obj => keys.map(key => JSON.stringify(obj[key] || '')).join(','))
      ].join('\n');
      result = csv;
    }
    // Base64 encode
    else if (to === 'base64') {
      result = Buffer.from(data).toString('base64');
    }
    // Base64 decode
    else if (from === 'base64') {
      result = Buffer.from(data, 'base64').toString('utf-8');
    }
    // Add more conversions as needed
    else {
      return NextResponse.json(
        { error: `Conversion from ${from} to ${to} not supported` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
      from,
      to
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Conversion failed' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
