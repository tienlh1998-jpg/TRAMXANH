'use client';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';
import {RefreshCw} from 'lucide-react';
export function RefreshStatus(){const router=useRouter();const [pending,start]=useTransition();return <button className="refresh-status" disabled={pending} onClick={()=>start(()=>router.refresh())}><RefreshCw size={16}/>{pending?'Đang cập nhật…':'Cập nhật trạng thái'}</button>;}
