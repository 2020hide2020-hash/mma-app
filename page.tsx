'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function Home() {
  const [votes, setVotes] = useState({ mikuru: 0, ren: 0 })
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  const MATCH_TITLE = '朝倉未来 vs 平本蓮'

  // 投票データをSupabaseから取得する
  const fetchVotes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('voted_for')
        .eq('match_title', MATCH_TITLE)

      if (error) throw error

      if (data) {
        const mikuruCount = data.filter(v => v.voted_for === '朝倉未来').length
        const renCount = data.filter(v => v.voted_for === '平本蓮').length
        setVotes({ mikuru: mikuruCount, ren: renCount })
      }
    } catch (error: any) {
      console.error('データ取得エラー:', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVotes()
  }, [])

  // 投票ボタンを押したときの処理
  const handleVote = async (candidate: string) => {
    setIsVoting(true)
    try {
      const { error } = await supabase
        .from('votes')
        .insert([{ match_title: MATCH_TITLE, voted_for: candidate }])

      if (error) throw error

      alert(`${candidate} に投票しました！`)
      await fetchVotes() // 票数を再取得
    } catch (error: any) {
      alert('投票に失敗しました: ' + error.message)
    } finally {
      setIsVoting(false)
    }
  }

  const totalVotes = votes.mikuru + votes.ren

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 text-center">
        <span className="text-sm font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
          超RIZIN勝敗予想
        </span>

        <h1 className="text-3xl font-black mt-4 mb-2 tracking-wider">
          {MATCH_TITLE}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          あなたの予想はどっち？
        </p>

        <div className="mb-8">
          {loading ? (
            <p className="text-slate-400">集計中...</p>
          ) : (
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-blue-400">朝倉未来: {votes.mikuru}票</span>
                <span className="text-red-400">平本蓮: {votes.ren}票</span>
              </div>

              <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${totalVotes > 0 ? (votes.mikuru / totalVotes) * 100 : 50}%` }}
                />
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${totalVotes > 0 ? (votes.ren / totalVotes) * 100 : 50}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">総投票数: {totalVotes}票</p>
            </div>
          )}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => handleVote('朝倉未来')}
            disabled={isVoting}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition duration-200 active:scale-95 disabled:opacity-50"
          >
            朝倉未来
          </button>
          <button
            onClick={() => handleVote('平本蓮')}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition duration-200 active:scale-95 disabled:opacity-50"
          >
            平本蓮
          </button>
        </div>
      </div>
    </main>
  )
}