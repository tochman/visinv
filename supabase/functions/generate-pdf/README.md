# PDF Generation Edge Function

This Supabase Edge Function generates PDFs from HTML using a headless Chrome service.

## Setup Options

### Option 1: Use Browserless.io (Recommended)

1. Sign up at [browserless.io](https://browserless.io) (free tier available)
2. Get your API key from the dashboard
3. Add the secret to Supabase:

```bash
supabase secrets set BROWSERLESS_API_KEY=your_api_key_here
```

4. Deploy the function:

```bash
supabase functions deploy generate-pdf
```

### Option 2: Self-hosted Browserless

Run browserless locally or on your own server:

```bash
docker run -p 3000:3000 browserless/chrome
```

Then modify the Edge Function to use your endpoint.

### Option 3: Fallback to Browser Print

If no `BROWSERLESS_API_KEY` is set, the function will return the HTML file,
and the frontend will fall back to using the browser's native print dialog
(which can save as PDF).

## Local Development

```bash
# Start Supabase locally
supabase start

# Run the function locally
supabase functions serve generate-pdf --env-file .env.local
```

## API Usage

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pdf`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify({
    html: '<html>...</html>',
    filename: 'invoice.pdf'
  }),
});

// Response is a PDF blob
const blob = await response.blob();
```

## Cost Considerations

- Browserless.io free tier: 100 PDF generations/month
- Self-hosted: Only server costs
- Browser print fallback: Free (no external service)
