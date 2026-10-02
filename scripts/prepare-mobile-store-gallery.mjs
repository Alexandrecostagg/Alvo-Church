// Offline store artwork: renders production React Native views with fictional data.
// This tool is not imported by the application or its store build.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const root=process.cwd();
const req=createRequire(path.join(root,'apps/mobile/package.json'));
const pnpmStore=path.join(root,'node_modules/.pnpm');
const esbuildPackage=fs.readdirSync(pnpmStore).find(name=>/^esbuild@/.test(name));
if(!esbuildPackage) throw new Error('Instale as dependências do workspace antes de gerar a galeria.');
const esbuild=createRequire(path.join(pnpmStore,esbuildPackage,'node_modules/esbuild/package.json'))('./lib/main.js');
const output=process.env.ESDRAS_STORE_OUTPUT || path.join(os.tmpdir(),'esdras-store-gallery');
const rnweb=process.env.ESDRAS_RN_WEB || path.join(os.tmpdir(),'esdras-store-render/node_modules/react-native-web/dist/index.js');
if(!fs.existsSync(rnweb)) throw new Error('Configure ESDRAS_RN_WEB conforme apps/mobile/store-assets/README.md.');
fs.mkdirSync(output,{recursive:true});
const mobile=path.join(root,'apps/mobile');
const glyphs=JSON.parse(fs.readFileSync(path.join(mobile,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json')));
fs.copyFileSync(path.join(mobile,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),path.join(output,'Ionicons.ttf'));
fs.copyFileSync(path.join(mobile,'assets/generated/esdras-app-icon.png'),path.join(output,'icon.png'));
const source=fs.readFileSync(path.join(mobile,'App.tsx'),'utf8');
const firebaseNames=source.match(/import \{([^{}]+)\} from "@alvo\/firebase";/)[1].split(',').map(s=>s.trim()).filter(s=>/^\w+$/.test(s));
const fixtures={
 fetchMemberJourneyProfile:'({ currentStage:"connecting" })',
 fetchMarketplacePromotions:'[]',fetchPublicPrayerWall:'[]'
};
await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{MainApp}from'./App.tsx';
globalThis.fetch=async()=>{throw new Error('Network disabled in offline store artwork')};const events=[{id:'demo-1',name:'Culto de Celebração',startsAt:'2026-10-04T21:00:00Z',type:'culto'},{id:'demo-2',name:'Encontro de Células',startsAt:'2026-10-07T22:30:00Z',type:'celula'},{id:'demo-3',name:'Encontro de Famílias',startsAt:'2026-10-10T18:00:00Z',type:'evento'}];
const org={id:'store-demo',name:'Plataforma Esdras',displayName:'Plataforma Esdras'};
createRoot(document.getElementById('root')).render(<MainApp user={{uid:'store-demo',displayName:'Ana Silva',email:'ana@example.invalid'}} tenantRuntime={{organization:org,settings:{branding:{primaryColor:'#d27836'}}}} linkedOrg={org} events={events} groups={[{id:'demo-cell',name:'Célula Caminho',meetingDayOfWeek:3,meetingTime:'19:30'}]} dataReady={true} pushToken={null} onSignOut={()=>{}}/>);`,resolveDir:mobile,loader:'tsx'},bundle:true,outfile:path.join(output,'screen.js'),format:'iife',jsx:'automatic',define:{__DEV__:'false','process.env.NODE_ENV':'"production"','process.env':'{}'},loader:{'.png':'dataurl'},plugins:[{name:'offline-store-views',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:req.resolve('react')}));
 b.onResolve({filter:/^react\/jsx-runtime$/},()=>({path:req.resolve('react/jsx-runtime')}));
 b.onResolve({filter:/^react-dom\/client$/},()=>({path:req.resolve('react-dom/client')}));
 b.onResolve({filter:/^react-native$/},()=>({path:rnweb}));
 b.onLoad({filter:/\/apps\/mobile\/App.tsx$/},()=>({contents:source.replace('function MainApp(','export function MainApp(').replace('useState<Tab>("inicio")','useState<Tab>((new URLSearchParams(location.search).get("tab") as Tab) || "inicio")'),loader:'tsx',resolveDir:mobile}));
 b.onResolve({filter:/^@alvo\/firebase$/},()=>({path:'firebase',namespace:'fixture'}));
 b.onResolve({filter:/^expo-|^@expo\/vector-icons$|^expo\/constants/},a=>({path:a.path,namespace:'fixture'}));
 b.onResolve({filter:/kids-private-image|member-pass-card|mobile-access-boundary/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>{
  if(a.path==='firebase')return{contents:firebaseNames.map(n=>`export const ${n}=async()=>${fixtures[n]||'null'};`).join('\n'),loader:'js'};
  if(a.path==='@expo/vector-icons')return{contents:`import React from 'react';const glyphs=${JSON.stringify(glyphs)};export function Ionicons({name,size=20,color,style}){return <span style={{fontFamily:'Ionicons',fontSize:size,color,lineHeight:1,...style}}>{String.fromCodePoint(glyphs[name]||0x25cf)}</span>};Ionicons.glyphMap=glyphs;`,loader:'jsx'};
  return{contents:'export const getItemAsync=async()=>null;export const setItemAsync=async()=>{};export const deleteItemAsync=async()=>{};export const setNotificationChannelAsync=async()=>{};export const AndroidImportance={DEFAULT:0};export const getPermissionsAsync=async()=>({status:"denied"});export const requestPermissionsAsync=getPermissionsAsync;export const getExpoPushTokenAsync=async()=>({data:null});export const randomUUID=()=>"store-demo";export const launchImageLibraryAsync=async()=>({canceled:true});export const launchCameraAsync=launchImageLibraryAsync;export const requestCameraPermissionsAsync=getPermissionsAsync;export default {};export const StatusBar=()=>null;export const KidsPrivateImage=()=>null;export const MemberPassCard=()=>null;export const MobileAccessBoundary=({children})=>children;export const CameraView=()=>null;export const useCameraPermissions=()=>[null,()=>{}];export const setNotificationHandler=()=>{};',loader:'js'};
 });
}}]});
fs.writeFileSync(path.join(output,'screen.html'),`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:Ionicons;src:url('/Ionicons.ttf')}html,body,#root{height:100%;margin:0}#root{display:flex}body{font-family:-apple-system,Arial}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;cursor:none!important}</style><div id="root"></div><script src="/screen.js"></script>`);
const template=fs.readFileSync(path.join(root,'apps/mobile/store-assets/gallery.html'),'utf8');
fs.writeFileSync(path.join(output,'index.html'),template);
console.log('Galeria preparada em '+output);
