'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Match {
  id: number
  fighter1: string
  fighter2: string
  event_name: string
}

export default function Home() {
  const [match, setMatch] = useState<Match | null>(null)
  const [votes, setVotes] = useState({ fighter1Count: 0, fighter2Count: 0 })
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  // 1. DBから最新の試合情報を取得する
  const fetchLatestMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('id', { ascending: false }) // 最新の試合を1件取得
        .limit(1)
        .single()

      if (error) throw error
      if (data) {
        setMatch(data)
        await fetchVotes(`${data.fighter1} vs ${data.fighter2}`)
      }
    } catch (error: any) {
      console.error('試合データ取得エラー:', error.message)
      setLoading(false)
    }
  }

  // 2. 投票データをSupabaseから取得する
  const fetchVotes = async (matchTitle: string) => {
    if (!match) return
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('voted_for')
        .eq('match_title', matchTitle)

      if (error) throw error

      if (data) {
        const f1Count = data.filter(v => v.voted_for === match.fighter1).length
        const f2Count = data.filter(v => v.voted_for === match.fighter2).length
        setVotes({ fighter1Count: f1Count, fighter2Count: f2Count })
      }
    } catch (error: any) {
      console.error('投票データ取得エラー:', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLatestMatch()
  }, [])

  // 3. 投票ボタンを押したときの処理
  const handleVote = async (candidate: string) => {
    if (!match) return
    setIsVoting(true)
    const matchTitle = `${match.fighter1} vs ${match.fighter2}`
    try {
      const { error } = await supabase
        .from('votes')
        .insert([{ match_title: matchTitle, voted_for: candidate }])

      if (error) throw error

      alert(`${candidate} に投票しました！`)
      setLoading(true)
      await fetchVotes(matchTitle)
    } catch (error: any) {
      alert('投票に失敗しました: ' + error.message)
    } finally {
      setIsVoting(false)
    }
  }

  if (loading || !match) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">試合データを読み込み中...</p>
      </main>
    )
  }

  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const matchTitle = `${match.fighter1} vs ${match.fighter2}`

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 text-center">
        <span className="text-sm font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
          {match.event_name}勝敗予想
        </span>

        <h1 className="text-3xl font-black mt-4 mb-2 tracking-wider">
          {matchTitle}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          あなたの予想はどっち？
        </p>

        <div className="mb-8">
          <div>
            <div className="flex justify-between text-sm font-bold mb-2">
              <span className="text-blue-400">{match.fighter1}: {votes.fighter1Count}票</span>
              <span className="text-red-400">{match.fighter2}: {votes.fighter2Count}票</span>
            </div>

            <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${totalVotes > 0 ? (votes.fighter1Count / totalVotes) * 100 : 50}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${totalVotes > 0 ? (votes.fighter2Count / totalVotes) * 100 : 50}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">総投票数: {totalVotes}票</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => handleVote(match.fighter1)}
            disabled={isVoting}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition duration-200 active:scale-95 disabled:opacity-50"
          >
            {match.fighter1}
          </button>
          <button
            onClick={() => handleVote(match.fighter2)}
            disabled={isVoting}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition duration-200 active:scale-95 disabled:opacity-50"
          >
            {match.fighter2}
          </button>
        </div>
      </div>
    </main>
  )
}
