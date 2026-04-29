"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabaseと合体！
const supabase = createClient( 
  'https://nongzgmpqhjsdptjgdgi.supabase.co',
`sb_publishable_8u_GZvfrouLlvZs5UrhgAA_F93lCh7x` 
);

export default function Home() {
  const [voted, setVoted] = useState(false);

  const handleVote = async (name: string) => {
    // Supabaseの「predictions」テーブルにデータを送る
    const { error } = await supabase
      .from('predictions')
      .insert([{ match_id: 1, winner: name }]);

    if (error) {
      console.error(error);
      console.error(error); // 開発者用の裏画面に詳細を出す
alert('エラー詳細: ' + error.message); // 画面に本当の理由を出す
    } else {
      setVoted(true);
      alert(`${name} 選手への投票をクラウドに保存しました！`);
    }
  };

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-white flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8 text-blue-400">MMA 予想アプリ</h1>
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">朝倉未来 vs 平本蓮</h2>
        {voted ? (
          <p className="text-green-400 font-bold text-xl">投票ありがとうございました！</p>
        ) : (
          <div className="flex justify-center gap-6">
            <button onClick={() => handleVote('朝倉未来')} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold">朝倉未来</button>
            <button onClick={() => handleVote('平本蓮')} className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded-xl font-bold">平本蓮</button>
          </div>
        )}
      </div>
    </div>
  );
}