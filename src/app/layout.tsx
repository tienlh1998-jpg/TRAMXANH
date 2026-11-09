import type { Metadata } from 'next';
import '@fontsource/bricolage-grotesque/latin-700.css';
import '@fontsource/bricolage-grotesque/vietnamese-700.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/vietnamese-400.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/vietnamese-600.css';
import './globals.css';
import {ConnectionStatus} from '@/components/connection-status';
export const metadata: Metadata = { title: { default: 'EcoPoint – Đổi rác lấy điểm xanh', template: '%s | EcoPoint' }, description: 'Phân loại đúng – Tích điểm xanh – Tạo giá trị thật.' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="vi"><body><ConnectionStatus/>{children}</body></html>; }
