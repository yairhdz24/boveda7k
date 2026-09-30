/** URL pública del sitio: en Vercel usa el dominio de producción; en local, localhost. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_DESCRIPTION = "Credenciales de cada cliente, en un solo lugar y cifradas.";
