import { createGarminHandler } from './_garmin-core.js'

// Vercel-Funktion: GET /api/garmin?start=YYYY-MM-DD&end=YYYY-MM-DD
export const GET = createGarminHandler({ env: process.env })
