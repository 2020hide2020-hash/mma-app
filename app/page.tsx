'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

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
  const [user, setUser] = useState<any>(null)
  const [votes, setVotes] = useState({ fighter1Count: 0, fighter2Count: 0 })
  const [myPrediction, setMyPrediction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  // 1. ユーザーのログイン状態を監視・取得
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. 最新の試合情報を取得
  const fetchLatestMatch = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      if (data) {
        setMatch(data)
        await fetchPredictions(data, user)
      } else {
        setLoading(false)
      }
    } catch (error: any) {
      console.error('試合データ取得エラー:', error.message)
      setLoading(false)
    }
  }

  // ユーザー状態が変わったらデータを再取得
  useEffect(() => {
    fetchLatestMatch()
  }, [user])

  // 3. 投票データ（全体・自分）を取得する
  const fetchPredictions = async (currentMatch: Match, currentUser: any) => {
    try {
      // 全体の投票数を取得
      const { data: allVotes, error: votesError } = await supabase
        .from('predictions')
        .select('winner, user_id')
        .eq('match_id', currentMatch.id)

      if (votesError) throw votesError

      if (allVotes) {
        const f1Count = allVotes.filter(v => v.winner === currentMatch.fighter1).length
        const f2Count = allVotes.filter(v => v.winner === currentMatch.fighter2).length
        setVotes({ fighter1Count: f1Count, fighter2Count: f2Count })

        // 自分が投票済みかチェック
        if (currentUser) {
          const userVote = allVotes.find(v => v.user_id === currentUser.id)
          setMyPrediction(userVote ? userVote.winner : null)
        } else {
          setMyPrediction(null)
        }
      }
    } catch (error: any) {
      console.error('データ取得エラー:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Googleログイン実行
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) alert('ログイン失敗: ' + error.message)
  }

  // ログアウト実行
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) alert('ログアウト失敗: ' + error.message)
  }

  // 投票実行
  const handleVote = async (candidate: string) => {
    if (!match || !user) return
    setIsVoting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .insert([
          {
            user_id: user.id,
            match_id: match.id,
            winner: candidate,
          },
        ])

      if (error) throw error

      alert(`${candidate} に投票しました！`)
      setLoading(true)
      await fetchLatestMatch()
    } catch (error: any) {
      alert('投票に失敗しました: ' + error.message)
    } finally {
      setIsVoting(false)
    }
  }

  if (loading || !match) {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">データを読み込み中...</p>
      </main>
    )
  }

  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const matchTitle = `${match.fighter1} vs ${match.fighter2}`

  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative">
      {/* ユーザー情報・ログインエリア */}
      <div className="absolute top-4 right-4 flex items-center space-x-3">
        {user ? (
          <div className="flex items-center space-x-3 bg-slate-800 p-2 rounded-xl border border-slate-700">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm font-medium hidden sm:inline">{user.user_metadata?.full_name || 'ユーザー'}</span>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition"
          >
            Googleログイン
          </button>
        )}
      </div>

      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 text-center mt-12">
        <span className="text-sm font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
          {match.event_name}勝敗予想
        </span>

        <h1 className="text-3xl font-black mt-4 mb-2 tracking-wider">
          {matchTitle}
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {user ? 'あなたの予想はどっち？' : '投票するにはログインが必要です'}
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

        {user ? (
          myPrediction ? (
            <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600">
              <p className="text-sm font-medium text-slate-300">あなたはすでに予想済みです！</p>
              <p className="text-lg font-black mt-1">
                予想： <span className={myPrediction === match.fighter1 ? 'text-blue-400' : 'text-red-400'}>{myPrediction}</span>
              </p>
            </div>
          ) : (
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
          )
        ) : (
          <button
            onClick={handleLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition duration-200 active:scale-95"
          >
            Googleログインして予想する
          </button>
        )}
      </div>
    </main>
  )
}
