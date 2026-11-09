'use server';
import QRCode from 'qrcode';
import {requireProfile} from '@/lib/auth';
export async function stationPrintQr(stationId:string){
 const {client}=await requireProfile(['ADMIN']);
 const {data,error}=await client.from('stations').select('id,name,location,active').eq('id',stationId).single();
 if(error||!data?.active)return {error:'Không tìm thấy trạm đang hoạt động.',qr:null};
 const payload=`eco-station:${data.id}`;
 return {error:'',qr:{name:data.name as string,location:data.location as string|null,image:await QRCode.toDataURL(payload,{width:1200,margin:4,errorCorrectionLevel:'M'})}};
}
