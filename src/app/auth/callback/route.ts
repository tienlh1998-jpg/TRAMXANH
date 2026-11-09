import {NextResponse,type NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {provisionStudent} from '@/lib/student-registration';
export async function GET(request:NextRequest){const code=request.nextUrl.searchParams.get('code');if(code){const client=await createClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error){if(request.nextUrl.searchParams.get('flow')==='recovery')return NextResponse.redirect(new URL('/dat-lai-mat-khau',request.url));const issue=await provisionStudent(client);if(!issue)return NextResponse.redirect(new URL('/tai-khoan',request.url));}}return NextResponse.redirect(new URL('/dang-nhap?status=confirmation',request.url));}
