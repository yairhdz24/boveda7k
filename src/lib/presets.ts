import type { ServiceKind } from "./types";

/**
 * Catálogo inicial de servicios.
 * Logos: SVGL (https://svgl.app) — se usa la variante clara porque el LogoTile tiene fondo blanco.
 * Los que SVGL no tiene usan el favicon oficial del dominio del servicio.
 */
const svgl = (file: string) => `https://svgl.app/library/${file}`;
const fav = (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export type ServicePreset = { name: string; logo_url: string | null; category: string; kind: ServiceKind; login_url: string | null };

export const SERVICE_PRESETS: ServicePreset[] = [
  /* ── Google ──────────────────────────────────────────── */
  { name: "Google Tag Manager", logo_url: fav("tagmanager.google.com"), category: "Analítica", kind: "login", login_url: "https://tagmanager.google.com" },
  { name: "Google Analytics", logo_url: svgl("google-analytics.svg"), category: "Analítica", kind: "login", login_url: "https://analytics.google.com" },
  { name: "Google Search Console", logo_url: fav("search.google.com"), category: "SEO", kind: "login", login_url: "https://search.google.com/search-console" },
  { name: "Google Ads", logo_url: fav("ads.google.com"), category: "Publicidad", kind: "login", login_url: "https://ads.google.com" },
  { name: "Google Business Profile", logo_url: fav("business.google.com"), category: "SEO", kind: "login", login_url: "https://business.google.com" },
  { name: "Google Maps Platform", logo_url: svgl("googleMaps.svg"), category: "API", kind: "api", login_url: "https://console.cloud.google.com/google/maps-apis" },
  { name: "Google Cloud", logo_url: svgl("google-cloud.svg"), category: "Nube", kind: "api", login_url: "https://console.cloud.google.com" },
  { name: "Google Drive", logo_url: svgl("drive.svg"), category: "Archivos", kind: "login", login_url: "https://drive.google.com" },
  { name: "Google Sheets", logo_url: svgl("google-sheets.svg"), category: "Productividad", kind: "login", login_url: "https://sheets.google.com" },
  { name: "Google Calendar", logo_url: svgl("google-calendar.svg"), category: "Productividad", kind: "login", login_url: "https://calendar.google.com" },
  { name: "Google Play Console", logo_url: svgl("googleplay.svg"), category: "Apps móviles", kind: "login", login_url: "https://play.google.com/console" },
  { name: "Gmail / Google Workspace", logo_url: svgl("gmail.svg"), category: "Correo", kind: "email", login_url: "https://mail.google.com" },
  { name: "Gemini API", logo_url: svgl("gemini.svg"), category: "IA", kind: "api", login_url: "https://aistudio.google.com" },
  /* ── Analítica y SEO ─────────────────────────────────── */
  { name: "PostHog", logo_url: svgl("posthog.svg"), category: "Analítica", kind: "api", login_url: "https://app.posthog.com" },
  { name: "Plausible", logo_url: svgl("plausible.svg"), category: "Analítica", kind: "login", login_url: "https://plausible.io/login" },
  { name: "Hotjar", logo_url: fav("hotjar.com"), category: "Analítica", kind: "login", login_url: "https://insights.hotjar.com" },
  { name: "Microsoft Clarity", logo_url: fav("clarity.microsoft.com"), category: "Analítica", kind: "login", login_url: "https://clarity.microsoft.com" },
  { name: "Ahrefs", logo_url: svgl("ahrefs.svg"), category: "SEO", kind: "login", login_url: "https://app.ahrefs.com" },
  { name: "Semrush", logo_url: fav("semrush.com"), category: "SEO", kind: "login", login_url: "https://www.semrush.com/login" },
  /* ── Publicidad y redes ──────────────────────────────── */
  { name: "Meta Business Suite", logo_url: svgl("meta.svg"), category: "Publicidad", kind: "login", login_url: "https://business.facebook.com" },
  { name: "Facebook", logo_url: svgl("facebook-icon.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.facebook.com" },
  { name: "Instagram", logo_url: svgl("instagram-icon.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.instagram.com" },
  { name: "Threads", logo_url: svgl("threads.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.threads.net" },
  { name: "TikTok", logo_url: svgl("tiktok-icon-light.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.tiktok.com" },
  { name: "TikTok Ads", logo_url: svgl("tiktok-icon-light.svg"), category: "Publicidad", kind: "login", login_url: "https://ads.tiktok.com" },
  { name: "X (Twitter)", logo_url: svgl("x.svg"), category: "Redes sociales", kind: "login", login_url: "https://x.com/login" },
  { name: "LinkedIn", logo_url: svgl("linkedin.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.linkedin.com/login" },
  { name: "YouTube", logo_url: svgl("youtube.svg"), category: "Redes sociales", kind: "login", login_url: "https://studio.youtube.com" },
  { name: "Pinterest", logo_url: svgl("pinterest.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.pinterest.com/login" },
  { name: "Snapchat", logo_url: svgl("snapchat.svg"), category: "Redes sociales", kind: "login", login_url: "https://ads.snapchat.com" },
  { name: "Reddit", logo_url: svgl("reddit.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.reddit.com/login" },
  { name: "Twitch", logo_url: svgl("twitch.svg"), category: "Redes sociales", kind: "login", login_url: "https://www.twitch.tv" },
  { name: "Microsoft Ads (Bing)", logo_url: svgl("bing.svg"), category: "Publicidad", kind: "login", login_url: "https://ads.microsoft.com" },
  /* ── Mensajería ──────────────────────────────────────── */
  { name: "WhatsApp Business", logo_url: svgl("whatsapp-icon.svg"), category: "Mensajería", kind: "api", login_url: "https://business.facebook.com/wa/manage" },
  { name: "Evolution API", logo_url: null, category: "Mensajería", kind: "api", login_url: null },
  { name: "Twilio", logo_url: svgl("twilio.svg"), category: "Mensajería", kind: "api", login_url: "https://console.twilio.com" },
  { name: "Telegram Bot", logo_url: svgl("telegram.svg"), category: "Mensajería", kind: "api", login_url: "https://t.me/BotFather" },
  { name: "Messenger", logo_url: svgl("messenger.svg"), category: "Mensajería", kind: "api", login_url: "https://business.facebook.com" },
  { name: "Discord", logo_url: svgl("discord.svg"), category: "Mensajería", kind: "api", login_url: "https://discord.com/developers/applications" },
  { name: "Slack", logo_url: svgl("slack.svg"), category: "Mensajería", kind: "login", login_url: "https://slack.com/signin" },
  { name: "Microsoft Teams", logo_url: svgl("microsoft-teams.svg"), category: "Mensajería", kind: "login", login_url: "https://teams.microsoft.com" },
  { name: "Zoom", logo_url: svgl("zoom.svg"), category: "Mensajería", kind: "login", login_url: "https://zoom.us/signin" },
  /* ── Correo ──────────────────────────────────────────── */
  { name: "Microsoft 365 / Outlook", logo_url: svgl("microsoft-outlook.svg"), category: "Correo", kind: "email", login_url: "https://outlook.office.com" },
  { name: "Proton Mail", logo_url: svgl("protonmail.svg"), category: "Correo", kind: "email", login_url: "https://account.proton.me/login" },
  { name: "Zoho Mail", logo_url: fav("zoho.com"), category: "Correo", kind: "email", login_url: "https://mail.zoho.com" },
  { name: "Resend", logo_url: svgl("resend-icon-black.svg"), category: "Correo", kind: "api", login_url: "https://resend.com/login" },
  { name: "SendGrid", logo_url: fav("sendgrid.com"), category: "Correo", kind: "api", login_url: "https://app.sendgrid.com" },
  { name: "Mailgun", logo_url: fav("mailgun.com"), category: "Correo", kind: "api", login_url: "https://login.mailgun.com" },
  { name: "Amazon SES", logo_url: svgl("aws_light.svg"), category: "Correo", kind: "api", login_url: "https://console.aws.amazon.com/ses" },
  { name: "Mailchimp", logo_url: fav("mailchimp.com"), category: "Email marketing", kind: "login", login_url: "https://login.mailchimp.com" },
  { name: "Brevo", logo_url: fav("brevo.com"), category: "Email marketing", kind: "api", login_url: "https://app.brevo.com" },
  { name: "Klaviyo", logo_url: fav("klaviyo.com"), category: "Email marketing", kind: "login", login_url: "https://www.klaviyo.com/login" },
  /* ── Bases de datos ──────────────────────────────────── */
  { name: "Supabase", logo_url: svgl("supabase.svg"), category: "Base de datos", kind: "api", login_url: "https://supabase.com/dashboard" },
  { name: "Firebase", logo_url: svgl("firebase.svg"), category: "Base de datos", kind: "api", login_url: "https://console.firebase.google.com" },
  { name: "PostgreSQL", logo_url: svgl("postgresql.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "MySQL", logo_url: svgl("mysql-icon-light.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "MariaDB", logo_url: svgl("mariadb.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "Microsoft SQL Server", logo_url: svgl("sql-server.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "SQLite", logo_url: svgl("sqlite.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "MongoDB Atlas", logo_url: svgl("mongodb-icon-light.svg"), category: "Base de datos", kind: "database", login_url: "https://cloud.mongodb.com" },
  { name: "Redis", logo_url: svgl("redis.svg"), category: "Base de datos", kind: "database", login_url: null },
  { name: "Upstash", logo_url: svgl("upstash.svg"), category: "Base de datos", kind: "api", login_url: "https://console.upstash.com" },
  { name: "Neon", logo_url: svgl("neon.svg"), category: "Base de datos", kind: "database", login_url: "https://console.neon.tech" },
  { name: "PlanetScale", logo_url: svgl("planetscale.svg"), category: "Base de datos", kind: "database", login_url: "https://app.planetscale.com" },
  { name: "Turso", logo_url: svgl("turso-light.svg"), category: "Base de datos", kind: "database", login_url: "https://app.turso.tech" },
  { name: "Convex", logo_url: svgl("convex.svg"), category: "Base de datos", kind: "api", login_url: "https://dashboard.convex.dev" },
  { name: "Appwrite", logo_url: svgl("appwrite.svg"), category: "Base de datos", kind: "api", login_url: "https://cloud.appwrite.io" },
  { name: "PocketBase", logo_url: svgl("pocket-base.svg"), category: "Base de datos", kind: "api", login_url: null },
  { name: "Xata", logo_url: svgl("xata.svg"), category: "Base de datos", kind: "api", login_url: "https://app.xata.io" },
  { name: "Qdrant", logo_url: svgl("qdrant-icon-light.svg"), category: "Base de datos", kind: "api", login_url: "https://cloud.qdrant.io" },
  { name: "Apache Kafka", logo_url: svgl("apache-kafka-light.svg"), category: "Base de datos", kind: "server", login_url: null },
  /* ── Servidores y nube ───────────────────────────────── */
  { name: "Servidor SSH", logo_url: null, category: "Servidor", kind: "server", login_url: null },
  { name: "Linux / Ubuntu", logo_url: svgl("ubuntu.svg"), category: "Servidor", kind: "server", login_url: null },
  { name: "Nginx", logo_url: svgl("nginx.svg"), category: "Servidor", kind: "server", login_url: null },
  { name: "Docker Hub", logo_url: svgl("docker.svg"), category: "Servidor", kind: "login", login_url: "https://hub.docker.com" },
  { name: "Kubernetes", logo_url: svgl("kubernetes.svg"), category: "Servidor", kind: "server", login_url: null },
  { name: "Hetzner", logo_url: fav("hetzner.com"), category: "Servidor", kind: "server", login_url: "https://console.hetzner.cloud" },
  { name: "DigitalOcean", logo_url: svgl("digitalocean.svg"), category: "Servidor", kind: "server", login_url: "https://cloud.digitalocean.com" },
  { name: "Contabo", logo_url: fav("contabo.com"), category: "Servidor", kind: "server", login_url: "https://my.contabo.com" },
  { name: "Vultr", logo_url: fav("vultr.com"), category: "Servidor", kind: "server", login_url: "https://my.vultr.com" },
  { name: "Linode (Akamai)", logo_url: fav("linode.com"), category: "Servidor", kind: "server", login_url: "https://cloud.linode.com" },
  { name: "OVHcloud", logo_url: fav("ovhcloud.com"), category: "Servidor", kind: "server", login_url: "https://www.ovh.com/manager" },
  { name: "Amazon Web Services", logo_url: svgl("aws_light.svg"), category: "Nube", kind: "api", login_url: "https://console.aws.amazon.com" },
  { name: "Microsoft Azure", logo_url: svgl("azure.svg"), category: "Nube", kind: "api", login_url: "https://portal.azure.com" },
  { name: "Oracle Cloud", logo_url: fav("oracle.com"), category: "Nube", kind: "api", login_url: "https://cloud.oracle.com" },
  { name: "Cloudinary", logo_url: svgl("cloudinary.svg"), category: "Archivos", kind: "api", login_url: "https://console.cloudinary.com" },
  { name: "Dropbox", logo_url: svgl("dropbox.svg"), category: "Archivos", kind: "login", login_url: "https://www.dropbox.com/login" },
  { name: "Microsoft OneDrive", logo_url: svgl("microsoft-onedrive.svg"), category: "Archivos", kind: "login", login_url: "https://onedrive.live.com" },
  /* ── Hosting ─────────────────────────────────────────── */
  { name: "Vercel", logo_url: svgl("vercel.svg"), category: "Hosting", kind: "login", login_url: "https://vercel.com/login" },
  { name: "Netlify", logo_url: svgl("netlify.svg"), category: "Hosting", kind: "login", login_url: "https://app.netlify.com" },
  { name: "Railway", logo_url: svgl("railway.svg"), category: "Hosting", kind: "login", login_url: "https://railway.app/login" },
  { name: "Render", logo_url: svgl("render_black.svg"), category: "Hosting", kind: "login", login_url: "https://dashboard.render.com" },
  { name: "Fly.io", logo_url: svgl("fly.svg"), category: "Hosting", kind: "api", login_url: "https://fly.io/dashboard" },
  { name: "Heroku", logo_url: svgl("heroku.svg"), category: "Hosting", kind: "login", login_url: "https://id.heroku.com/login" },
  { name: "Cloudflare Pages / Workers", logo_url: svgl("cloudflare-workers.svg"), category: "Hosting", kind: "api", login_url: "https://dash.cloudflare.com" },
  { name: "Hostinger", logo_url: fav("hostinger.com"), category: "Hosting", kind: "login", login_url: "https://hpanel.hostinger.com" },
  { name: "HostGator", logo_url: svgl("hostgator.svg"), category: "Hosting", kind: "login", login_url: "https://portal.hostgator.com" },
  { name: "SiteGround", logo_url: fav("siteground.com"), category: "Hosting", kind: "login", login_url: "https://login.siteground.com" },
  { name: "Bluehost", logo_url: fav("bluehost.com"), category: "Hosting", kind: "login", login_url: "https://my.bluehost.com" },
  { name: "cPanel", logo_url: svgl("cP_orange.svg"), category: "Hosting", kind: "login", login_url: null },
  { name: "Plesk", logo_url: fav("plesk.com"), category: "Hosting", kind: "login", login_url: null },
  /* ── DNS y dominios ──────────────────────────────────── */
  { name: "Cloudflare", logo_url: svgl("cloudflare.svg"), category: "DNS", kind: "login", login_url: "https://dash.cloudflare.com" },
  { name: "GoDaddy", logo_url: svgl("godaddy.svg"), category: "Dominios", kind: "login", login_url: "https://sso.godaddy.com" },
  { name: "Namecheap", logo_url: fav("namecheap.com"), category: "Dominios", kind: "login", login_url: "https://www.namecheap.com/myaccount/login/" },
  { name: "Porkbun", logo_url: fav("porkbun.com"), category: "Dominios", kind: "login", login_url: "https://porkbun.com/account/login" },
  { name: "Squarespace Domains", logo_url: fav("domains.squarespace.com"), category: "Dominios", kind: "login", login_url: "https://account.squarespace.com" },
  { name: "Akky (.mx)", logo_url: fav("akky.mx"), category: "Dominios", kind: "login", login_url: "https://www.akky.mx" },
  /* ── Código, apps y monitoreo ────────────────────────── */
  { name: "GitHub", logo_url: svgl("github_light.svg"), category: "Código", kind: "login", login_url: "https://github.com/login" },
  { name: "GitLab", logo_url: svgl("gitlab.svg"), category: "Código", kind: "login", login_url: "https://gitlab.com/users/sign_in" },
  { name: "Bitbucket", logo_url: fav("bitbucket.org"), category: "Código", kind: "login", login_url: "https://bitbucket.org/account/signin" },
  { name: "npm", logo_url: svgl("npm.svg"), category: "Código", kind: "api", login_url: "https://www.npmjs.com/login" },
  { name: "Postman", logo_url: svgl("postman.svg"), category: "Código", kind: "login", login_url: "https://identity.getpostman.com/login" },
  { name: "Ngrok", logo_url: svgl("ngrok-light.svg"), category: "Código", kind: "api", login_url: "https://dashboard.ngrok.com" },
  { name: "Expo / EAS", logo_url: svgl("expo.svg"), category: "Apps móviles", kind: "api", login_url: "https://expo.dev/login" },
  { name: "App Store Connect", logo_url: svgl("apple.svg"), category: "Apps móviles", kind: "login", login_url: "https://appstoreconnect.apple.com" },
  { name: "Sentry", logo_url: svgl("sentry.svg"), category: "Monitoreo", kind: "api", login_url: "https://sentry.io/auth/login" },
  { name: "Datadog", logo_url: svgl("datadog.svg"), category: "Monitoreo", kind: "api", login_url: "https://app.datadoghq.com" },
  { name: "Grafana", logo_url: svgl("grafana.svg"), category: "Monitoreo", kind: "login", login_url: "https://grafana.com/auth/sign-in" },
  /* ── Autenticación ───────────────────────────────────── */
  { name: "Auth0", logo_url: svgl("auth0.svg"), category: "Autenticación", kind: "api", login_url: "https://manage.auth0.com" },
  { name: "Clerk", logo_url: svgl("clerk-icon-light.svg"), category: "Autenticación", kind: "api", login_url: "https://dashboard.clerk.com" },
  { name: "Keycloak", logo_url: svgl("keycloak.svg"), category: "Autenticación", kind: "login", login_url: null },
  { name: "1Password", logo_url: svgl("1password-light.svg"), category: "Autenticación", kind: "login", login_url: "https://my.1password.com" },
  { name: "Bitwarden", logo_url: svgl("bitwarden.svg"), category: "Autenticación", kind: "login", login_url: "https://vault.bitwarden.com" },
  /* ── CMS y e-commerce ────────────────────────────────── */
  { name: "WordPress", logo_url: svgl("wordpress.svg"), category: "CMS", kind: "login", login_url: null },
  { name: "Elementor", logo_url: svgl("elementor.svg"), category: "CMS", kind: "login", login_url: "https://my.elementor.com" },
  { name: "Webflow", logo_url: svgl("webflow.svg"), category: "CMS", kind: "login", login_url: "https://webflow.com/dashboard/login" },
  { name: "Framer", logo_url: svgl("framer.svg"), category: "CMS", kind: "login", login_url: "https://framer.com/projects" },
  { name: "Wix", logo_url: fav("wix.com"), category: "CMS", kind: "login", login_url: "https://users.wix.com/signin" },
  { name: "Squarespace", logo_url: fav("squarespace.com"), category: "CMS", kind: "login", login_url: "https://login.squarespace.com" },
  { name: "Strapi", logo_url: svgl("strapi.svg"), category: "CMS", kind: "login", login_url: null },
  { name: "Sanity", logo_url: svgl("sanity-light.svg"), category: "CMS", kind: "api", login_url: "https://www.sanity.io/manage" },
  { name: "Directus", logo_url: svgl("directus.svg"), category: "CMS", kind: "login", login_url: null },
  { name: "Payload CMS", logo_url: svgl("payload.svg"), category: "CMS", kind: "login", login_url: null },
  { name: "Storyblok", logo_url: svgl("storyblok.svg"), category: "CMS", kind: "api", login_url: "https://app.storyblok.com" },
  { name: "Shopify", logo_url: svgl("shopify.svg"), category: "E-commerce", kind: "login", login_url: "https://accounts.shopify.com" },
  { name: "WooCommerce", logo_url: fav("woocommerce.com"), category: "E-commerce", kind: "api", login_url: null },
  { name: "Tiendanube", logo_url: fav("tiendanube.com"), category: "E-commerce", kind: "login", login_url: "https://www.tiendanube.com/login" },
  { name: "Mercado Libre", logo_url: svgl("mercado-libre.svg"), category: "E-commerce", kind: "login", login_url: "https://www.mercadolibre.com.mx" },
  { name: "Amazon Seller Central", logo_url: fav("sellercentral.amazon.com"), category: "E-commerce", kind: "login", login_url: "https://sellercentral.amazon.com.mx" },
  { name: "Hotmart", logo_url: svgl("hotmart.svg"), category: "E-commerce", kind: "login", login_url: "https://app.hotmart.com" },
  /* ── Pagos y facturación ─────────────────────────────── */
  { name: "Stripe", logo_url: svgl("stripe.svg"), category: "Pagos", kind: "api", login_url: "https://dashboard.stripe.com" },
  { name: "PayPal", logo_url: svgl("paypal.svg"), category: "Pagos", kind: "api", login_url: "https://www.paypal.com/signin" },
  { name: "Mercado Pago", logo_url: svgl("mercado-pago.svg"), category: "Pagos", kind: "api", login_url: "https://www.mercadopago.com.mx/developers/panel" },
  { name: "Conekta", logo_url: fav("conekta.com"), category: "Pagos", kind: "api", login_url: "https://panel.conekta.com" },
  { name: "Clip", logo_url: fav("clip.mx"), category: "Pagos", kind: "login", login_url: "https://dashboard.clip.mx" },
  { name: "Openpay", logo_url: fav("openpay.mx"), category: "Pagos", kind: "api", login_url: "https://dashboard.openpay.mx" },
  { name: "Lemon Squeezy", logo_url: svgl("lemonsqueezy.svg"), category: "Pagos", kind: "api", login_url: "https://app.lemonsqueezy.com" },
  { name: "Polar", logo_url: svgl("polar-sh_light.svg"), category: "Pagos", kind: "api", login_url: "https://polar.sh/login" },
  { name: "Facturama", logo_url: fav("facturama.mx"), category: "Facturación", kind: "api", login_url: "https://app.facturama.mx" },
  { name: "SAT", logo_url: fav("sat.gob.mx"), category: "Facturación", kind: "login", login_url: "https://www.sat.gob.mx" },
  /* ── Automatización y CRM ────────────────────────────── */
  { name: "n8n", logo_url: svgl("n8n.svg"), category: "Automatización", kind: "login", login_url: null },
  { name: "Zapier", logo_url: fav("zapier.com"), category: "Automatización", kind: "login", login_url: "https://zapier.com/app/login" },
  { name: "Make", logo_url: fav("make.com"), category: "Automatización", kind: "login", login_url: "https://www.make.com/en/login" },
  { name: "HubSpot", logo_url: fav("hubspot.com"), category: "CRM", kind: "login", login_url: "https://app.hubspot.com/login" },
  { name: "Salesforce", logo_url: svgl("salesforce.svg"), category: "CRM", kind: "login", login_url: "https://login.salesforce.com" },
  { name: "GoHighLevel", logo_url: fav("gohighlevel.com"), category: "CRM", kind: "login", login_url: "https://app.gohighlevel.com" },
  { name: "Apollo.io", logo_url: svgl("apollo-io.svg"), category: "CRM", kind: "login", login_url: "https://app.apollo.io" },
  { name: "Calendly", logo_url: svgl("calendly.svg"), category: "Productividad", kind: "login", login_url: "https://calendly.com/login" },
  { name: "Cal.com", logo_url: svgl("cal.svg"), category: "Productividad", kind: "api", login_url: "https://app.cal.com" },
  /* ── IA ──────────────────────────────────────────────── */
  { name: "OpenAI", logo_url: svgl("openai.svg"), category: "IA", kind: "api", login_url: "https://platform.openai.com" },
  { name: "Anthropic (Claude)", logo_url: svgl("claude-ai-icon.svg"), category: "IA", kind: "api", login_url: "https://console.anthropic.com" },
  { name: "DeepSeek", logo_url: svgl("deepseek.svg"), category: "IA", kind: "api", login_url: "https://platform.deepseek.com" },
  { name: "Mistral AI", logo_url: svgl("mistral-ai_logo.svg"), category: "IA", kind: "api", login_url: "https://console.mistral.ai" },
  { name: "Groq", logo_url: svgl("groq.svg"), category: "IA", kind: "api", login_url: "https://console.groq.com" },
  { name: "xAI (Grok)", logo_url: svgl("xai_light.svg"), category: "IA", kind: "api", login_url: "https://console.x.ai" },
  { name: "OpenRouter", logo_url: svgl("openrouter_light.svg"), category: "IA", kind: "api", login_url: "https://openrouter.ai" },
  { name: "Perplexity", logo_url: svgl("perplexity.svg"), category: "IA", kind: "api", login_url: "https://www.perplexity.ai/settings/api" },
  { name: "Hugging Face", logo_url: svgl("hugging_face.svg"), category: "IA", kind: "api", login_url: "https://huggingface.co/login" },
  { name: "Replicate", logo_url: svgl("replicate_light.svg"), category: "IA", kind: "api", login_url: "https://replicate.com/signin" },
  { name: "ElevenLabs", logo_url: fav("elevenlabs.io"), category: "IA", kind: "api", login_url: "https://elevenlabs.io/app" },
  { name: "Midjourney", logo_url: svgl("midjourney.svg"), category: "IA", kind: "login", login_url: "https://www.midjourney.com" },
  { name: "Cursor", logo_url: svgl("cursor_light.svg"), category: "IA", kind: "login", login_url: "https://cursor.com" },
  { name: "Lovable", logo_url: svgl("lovable.svg"), category: "IA", kind: "login", login_url: "https://lovable.dev" },
  { name: "v0", logo_url: svgl("v0_light.svg"), category: "IA", kind: "login", login_url: "https://v0.dev" },
  /* ── Productividad y diseño ──────────────────────────── */
  { name: "Notion", logo_url: svgl("notion.svg"), category: "Productividad", kind: "login", login_url: "https://www.notion.so/login" },
  { name: "Trello", logo_url: svgl("trello.svg"), category: "Productividad", kind: "login", login_url: "https://trello.com/login" },
  { name: "ClickUp", logo_url: svgl("clickup.svg"), category: "Productividad", kind: "login", login_url: "https://app.clickup.com/login" },
  { name: "Asana", logo_url: svgl("asana-logo.svg"), category: "Productividad", kind: "login", login_url: "https://app.asana.com" },
  { name: "Linear", logo_url: svgl("linear.svg"), category: "Productividad", kind: "login", login_url: "https://linear.app/login" },
  { name: "Jira / Confluence", logo_url: svgl("atlassian.svg"), category: "Productividad", kind: "login", login_url: "https://id.atlassian.com/login" },
  { name: "Microsoft 365", logo_url: svgl("microsoft-office.svg"), category: "Productividad", kind: "login", login_url: "https://www.office.com" },
  { name: "Loom", logo_url: svgl("loom.svg"), category: "Productividad", kind: "login", login_url: "https://www.loom.com/login" },
  { name: "Figma", logo_url: svgl("figma.svg"), category: "Diseño", kind: "login", login_url: "https://www.figma.com/login" },
  { name: "Canva", logo_url: svgl("canva.svg"), category: "Diseño", kind: "login", login_url: "https://www.canva.com/login" },
  { name: "Adobe Creative Cloud", logo_url: svgl("adobe.svg"), category: "Diseño", kind: "login", login_url: "https://account.adobe.com" },
  { name: "Behance", logo_url: svgl("behance.svg"), category: "Diseño", kind: "login", login_url: "https://www.behance.net" },
  { name: "Dribbble", logo_url: svgl("dribbble.svg"), category: "Diseño", kind: "login", login_url: "https://dribbble.com/session/new" },
];

/* ── Buscador de logos en SVGL (https://svgl.app/api) ─────── */
type SvglRoute = string | { light: string; dark: string };
export type SvglResult = { id: number; title: string; category: string | string[]; route: SvglRoute };

/** Busca logos en SVGL. Devuelve la URL de la variante clara (fondo blanco del LogoTile). */
export async function searchSvgl(query: string): Promise<{ title: string; url: string; category: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`https://api.svgl.app?search=${encodeURIComponent(q)}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("SVGL no respondió. Inténtalo en un momento.");
  const data = (await res.json()) as SvglResult[];
  return data.slice(0, 24).map((r) => ({
    title: r.title,
    url: typeof r.route === "string" ? r.route : r.route.light,
    category: Array.isArray(r.category) ? r.category[0] : r.category,
  }));
}

/** Favicon del sitio del cliente (servicio público de Google). */
export function faviconFor(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return null;
  }
}

export function normalizeUrl(url: string): string | null {
  const v = url.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}
