const fs = require('fs');
const path = require('path');
const file = path.join('d:', 'Projetos 2026', 'Alvo-Church', 'apps', 'web', 'app', 'page.tsx');
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.startsWith('const organization = {'));
const endIndex = lines.findIndex(l => l.startsWith('export default function HomePage() {'));

if (startIndex !== -1 && endIndex !== -1) {
  const dataLines = lines.slice(startIndex, endIndex);
  
  const mockDataContent = `import { Activity, Bell, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Flame, Handshake, HeartHandshake, Landmark, LayoutDashboard, Map as MapIcon, Megaphone, MessageSquareText, QrCode, ReceiptText, Search, Send, ShieldCheck, Sparkles, Smartphone, Target, Trophy, UserPlus, UsersRound, Waypoints } from "lucide-react";
import { calculateTribeQuestionnaireResult, canManagePeople, createTribeReclassificationSnapshot, getBrandModeLabel, getEnabledModuleCount, getEventTypeLabel, getFollowUpStatusLabel, getGroupTypeLabel, getJourneyKindLabel, getPartnerBenefitCategoryLabel, getPlanTierLabel, getRecommendedReviewType, getRecommendedReviewTypeLabel, getRegistrationStatusLabel, getReviewRequestStatusLabel, getStrongestBehaviorSignal, getTribeDisplayLabel, getTribeValidationLabel, getVisitorStageLabel, isModuleEnabled, shouldRecommendTribeReview, tribeQuestionnaireV1 } from "@alvo/domain";
import type { OrganizationSettingsSnapshot } from "@alvo/types";

function getPersonDisplayName(person: any) { return person.firstName + " " + person.lastName; }
function getPersonName(personId: string) { return personId; }
function normalizeSearch(query: string) { return query.toLowerCase(); }

` + dataLines.map(l => l.startsWith('const ') ? l.replace('const ', 'export const ') : l).join('\n');
  
  const srcLib = path.join('d:', 'Projetos 2026', 'Alvo-Church', 'apps', 'web', 'src', 'lib');
  fs.mkdirSync(srcLib, { recursive: true });
  fs.writeFileSync(path.join(srcLib, 'mock-data.ts'), mockDataContent);
  
  // Extract all the variable names to import them back into page.tsx
  const exports = dataLines.filter(l => l.startsWith('const ')).map(l => {
    return l.split(' ')[1].split(':')[0]; // get the identifier
  }).join(', ');

  const replaceStr = `import { ${exports} } from "../src/lib/mock-data";\n\nfunction getPersonName(personId: string) { return personId; }\nfunction normalizeSearch(query: string) { return query.toLowerCase(); }\n\n`;
  
  const newLines = [...lines.slice(0, startIndex), replaceStr, ...lines.slice(endIndex)];
  fs.writeFileSync(file, newLines.join('\n'));
  console.log('Successfully extracted mock data');
} else {
  console.log('Could not find boundaries');
}
