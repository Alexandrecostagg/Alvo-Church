const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  const absolutePath = path.join(__dirname, filePath);
  if (fs.existsSync(absolutePath)) {
    let content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split('\n');
    let useClientIndex = -1;
    let exportRuntimeIndex = -1;

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes('"use client"') || lines[i].includes("'use client'")) {
        useClientIndex = i;
      }
      if (lines[i].includes("export const runtime = 'edge';")) {
        exportRuntimeIndex = i;
      }
    }

    if (exportRuntimeIndex !== -1 && useClientIndex !== -1 && exportRuntimeIndex < useClientIndex) {
      // remove both lines and put them back in the correct order
      const useClientLine = lines[useClientIndex];
      const exportRuntimeLine = lines[exportRuntimeIndex];

      lines.splice(useClientIndex, 1);
      lines.splice(exportRuntimeIndex, 1);

      lines.unshift(exportRuntimeLine);
      lines.unshift(useClientLine);

      fs.writeFileSync(absolutePath, lines.join('\n'));
      console.log(`Fixed use client ordering in ${filePath}`);
    }
  }
}

const routes = [
  'apps/web/app/join/[code]/page.tsx',
  'apps/web/app/(authenticated)/groups/[groupId]/banner/page.tsx',
  'apps/web/app/(authenticated)/marketplace-community/[storeId]/edit/page.tsx',
  'apps/web/app/(authenticated)/marketplace-community/[storeId]/page.tsx',
  'apps/web/app/(authenticated)/members/[personId]/page.tsx',
  'apps/web/app/p/[orgSlug]/give/page.tsx',
  'apps/web/app/p/[orgSlug]/visit/page.tsx',
  'apps/web/app/p/[orgSlug]/page.tsx'
];

routes.forEach(processFile);
