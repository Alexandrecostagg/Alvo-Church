'use client';
import {useEffect,useRef} from 'react';
import {mountPasskeys, type FirebasePasskeyClient} from '@alvo/firebase';
export function PasskeyPanel({client,userId}:{client:FirebasePasskeyClient;userId?:string|null}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(root.current)return mountPasskeys(root.current,client,{signedIn:Boolean(userId)});},[client,userId]);
  return <div ref={root} hidden />;
}
