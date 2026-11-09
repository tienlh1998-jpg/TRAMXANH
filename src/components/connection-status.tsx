'use client';
import {useEffect,useState} from 'react';
export function ConnectionStatus(){
 const [offline,setOffline]=useState(false);
 useEffect(()=>{const update=()=>setOffline(!navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 return offline?<div className="connection-status" role="alert">Đang mất kết nối. Không xác nhận giao dịch mới; khi có mạng, kiểm tra lịch sử trước khi thử lại.</div>:null;
}
