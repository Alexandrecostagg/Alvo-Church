const fs = require('fs');
const path = require('path');

const routes = [
  'apps/web/app/api/ai/route.ts',
  'apps/web/app/api/billing/checkout/route.ts',
  'apps/web/app/api/billing/courses/checkout/route.ts',
  'apps/web/app/api/billing/invoices/route.ts',
  'apps/web/app/api/billing/webhook/route.ts',
  'apps/web/app/api/communication/send-whatsapp/route.ts',
  'apps/web/app/api/giving/pix/route.ts',
  'apps/web/app/api/kids/qr/route.ts',
  'apps/web/app/api/media/banner-copy/route.ts',
  'apps/web/app/api/media/bg-proxy/route.ts',
  'apps/web/app/api/public/visit/route.ts',
  'apps/web/app/api/qr/route.ts',
  'apps/web/app/api/weekly-theme/route.ts',
  'apps/web/app/groups/[groupId]/banner/route.ts',
  'apps/web/app/join/[code]/page.tsx',
  'apps/web/app/marketplace-community/[storeId]/edit/page.tsx',
  'apps/web/app/marketplace-community/[storeId]/page.tsx',
  'apps/web/app/members/[personId]/page.tsx',
  'apps/web/app/p/[orgSlug]/give/page.tsx',
  'apps/web/app/p/[orgSlug]/visit/page.tsx',
  'apps/web/app/p/[orgSlug]/page.tsx'
];

routes.forEach(route => {
  const absolutePath = path.join(__dirname, route);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf8');
    if (!content.includes('export const runtime = "edge";') && !content.includes("export const runtime = 'edge';")) {
      content = "export const runtime = 'edge';\n" + content;
      fs.writeFileSync(absolutePath, content);
      console.log(`Updated ${route}`);
    }
  } else {
    console.log(`Missing file: ${route}`);
  }
});
