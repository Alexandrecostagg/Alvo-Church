const fs = require('fs');
const path = require('path');

const routes = [
  'apps/web/app/(authenticated)/groups/[groupId]/banner/page.tsx',
  'apps/web/app/(authenticated)/marketplace-community/[storeId]/edit/page.tsx',
  'apps/web/app/(authenticated)/marketplace-community/[storeId]/page.tsx',
  'apps/web/app/(authenticated)/members/[personId]/page.tsx',
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
