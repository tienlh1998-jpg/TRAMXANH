'use client';
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="app-shell"><main><h1>Chưa thể tải dữ liệu</h1><p>Kiểm tra kết nối và thử lại sau ít phút.</p><button className="button" onClick={reset}>Thử lại</button></main></div>; }
