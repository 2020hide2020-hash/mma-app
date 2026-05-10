'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Event {
  id: number
  name: string
  event_date: string
}

interface Match {
  id: number
  event_id: number
  fighter1: string
  fighter2: string
  fighter1_record: string
  fighter1_specialty: string
  fighter1_background: string
  fighter2_record: string
  fighter2_specialty: string
  fighter2_background: string
  youtube_id: string
}

export default function Home() {
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [user, setUser] = useState<any>(null)
  const [votes, setVotes] = useState({ fighter1Count: 0, fighter2Count: 0 })
  const [myPrediction, setMyPrediction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  // 1. ログイン監視
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

  // 2. 最新の大会データと所属する全試合データを一気に取得
  const fetchEventData = async () => {
    try {
      // 最新の大会を1件取得
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (eventError) throw eventError
      if (eventData) {
        setEvent(eventData)

        // その大会に紐づく試合カードを全件取得
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('event_id', eventData.id)
          .order('id', { ascending: true })

        if (matchesError) throw matchesError
        if (matchesData && matchesData.length > 0) {
          setMatches(matchesData)
          // 初期表示時は第1試合を選択状態にする
          if (!selectedMatch) {
            setSelectedMatch(matchesData[0])
            await fetchPredictions(matchesData[0], user)
          } else {
            // 選択済みの場合は最新情報を維持して投票データを取得
            const currentSelected = matchesData.find(m => m.id === selectedMatch.id) || matchesData[0]
            setSelectedMatch(currentSelected)
            await fetchPredictions(currentSelected, user)
          }
        }
      }
    } catch (error: any) {
      console.error('データ取得エラー:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // ユーザーのログイン状態、または選択中の試合が変わったら投票・予測データを再取得
  useEffect(() => {
    if (selectedMatch) {
      fetchPredictions(selectedMatch, user)
    }
  }, [selectedMatch, user])

  // 初期ロード
  useEffect(() => {
    fetchEventData()
  }, [])

  // 3. 選択した試合の「投票状況」と「自分の投票履歴」を取得
  const fetchPredictions = async (currentMatch: Match, currentUser: any) => {
    try {
      const { data: allVotes, error: votesError } = await supabase
        .from('predictions')
        .select('winner, user_id')
        .eq('match_id', currentMatch.id)

      if (votesError) throw votesError

      if (allVotes) {
        const f1Count = allVotes.filter(v => v.winner === currentMatch.fighter1).length
        const f2Count = allVotes.filter(v => v.winner === currentMatch.fighter2).length
        setVotes({ fighter1Count: f1Count, fighter2Count: f2Count })

        if (currentUser) {
          const userVote = allVotes.find(v => v.user_id === currentUser.id)
          setMyPrediction(userVote ? userVote.winner : null)
        } else {
          setMyPrediction(null)
        }
      }
    } catch (error: any) {
      console.error('投票データ取得エラー:', error.message)
    }
  }

  // ログイン・ログアウト処理
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) alert('ログイン失敗: ' + error.message)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) alert('ログアウト失敗: ' + error.message)
  }

  // 投票処理
  const handleVote = async (candidate: string) => {
    if (!selectedMatch || !user) return
    setIsVoting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .insert([
          {
            user_id: user.id,
            match_id: selectedMatch.id,
            winner: candidate,
          },
        ])

      if (error) throw error

      alert(`${candidate} に予想を投票しました！`)
      await fetchEventData() // 再ロードしてデータを同期
    } catch (error: any) {
      alert('投票に失敗しました: ' + error.message)
    } finally {
      setIsVoting(false)
    }
  }

  if (loading || !event || !selectedMatch) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">大会情報および熱狂文脈を読み込み中...</p>
      </main>
    )
  }

  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const percentF1 = totalVotes > 0 ? Math.round((votes.fighter1Count / totalVotes) * 100) : 50
  const percentF2 = totalVotes > 0 ? Math.round((votes.fighter2Count / totalVotes) * 100) : 50

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 relative">

      {/* GLOBAL HEADER */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">MATCHDAY ENHANCED OS</span>
          <h1 className="text-2xl font-black text-white">{event.name}</h1>
        </div>

        <div>
          {user ? (
            <div className="flex items-center space-x-3 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="User Avatar" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              <span className="text-sm font-semibold hidden md:inline">{user.user_metadata?.full_name}</span>
              <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white transition">ログアウト</button>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-white hover:bg-slate-100 text-slate-950 text-sm font-bold px-4 py-2 rounded-xl transition">
              Googleログイン
            </button>
          )}
        </div>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: 大会カードリスト (大会TOPとしての役割) */}
        <section className="lg:col-span-1 flex flex-col space-y-4">
          <h2 className="text-lg font-bold text-slate-400 tracking-wide border-l-4 border-emerald-400 pl-3">
            対戦カード一覧
          </h2>
          <div className="flex flex-col space-y-3">
            {matches.map((m) => {
              const isActive = m.id === selectedMatch.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="text-xs text-slate-500 font-bold uppercase mb-1">
                    {m.id === matches[0].id ? ':fire: MAIN CARD' : ':crossed_swords: SEMI-FINAL'}
                  </div>
                  <div className="flex justify-between items-center text-white">
                    <span className="font-bold text-lg">{m.fighter1}</span>
                    <span className="text-xs text-slate-500 font-black px-2">VS</span>
                    <span className="font-bold text-lg text-right">{m.fighter2}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* MIDDLE & RIGHT COLUMNS: 試合の深掘り・動画・比較UI */}
        <section className="lg:col-span-2 flex flex-col space-y-6">

          {/* :mag: COMPOSITE CONTENT ZONE (公式煽り動画) */}
          {selectedMatch.youtube_id && (
            <div className="w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 p-4">
              <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block mr-2 animate-pulse"></span>
                試合前 密着ドキュメンタリー・煽り映像（公式）
              </h3>
              <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-inner">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedMatch.youtube_id}`}
                  title="Official Promo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {/* :scales: DETAILED FIGHTER COMPARISON UI */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 mb-4 border-b border-slate-800 pb-2">
              選手徹底比較（試合の文脈とストーリー）
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Fighter 1 (Left Card) */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border-l-4 border-blue-500">
                <h4 className="text-xl font-black text-blue-400 mb-2">{selectedMatch.fighter1}</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">RECORD (戦績)</span>
                    <span className="font-bold text-white">{selectedMatch.fighter1_record || '未登録'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">STYLE (スタイル)</span>
                    <span className="font-bold text-white">{selectedMatch.fighter1_specialty || '未登録'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">STORY (因縁・背景)</span>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{selectedMatch.fighter1_background}</p>
                  </div>
                </div>
              </div>

              {/* Fighter 2 (Right Card) */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border-l-4 border-red-500">
                <h4 className="text-xl font-black text-red-400 mb-2">{selectedMatch.fighter2}</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">RECORD (戦績)</span>
                    <span className="font-bold text-white">{selectedMatch.fighter2_record || '未登録'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">STYLE (スタイル)</span>
                    <span className="font-bold text-white">{selectedMatch.fighter2_specialty || '未登録'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">STORY (因縁・背景)</span>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">{selectedMatch.fighter2_background}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* :bar_chart: REAL-TIME PREDICTION SECTION */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 text-center">
            <h3 className="text-md font-bold text-slate-200 mb-1">
              勝敗予想
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {user ? 'あなたの目利きを証明してください' : '予想を投票するにはGoogleログインが必要です'}
            </p>

            {/* GAUGE BAR */}
            <div className="mb-6">
              <div className="flex justify-between text-sm font-bold mb-2 px-1">
                <span className="text-blue-400">{selectedMatch.fighter1}: {votes.fighter1Count}票 ({percentF1}%)</span>
                <span className="text-red-400">{selectedMatch.fighter2}: {votes.fighter2Count}票 ({percentF2}%)</span>
              </div>
              <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-blue-500 transition-all duration-500" style={{ width: `${percentF1}%` }} />
                <div className="bg-red-500 transition-all duration-500" style={{ width: `${percentF2}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">総投票数: {totalVotes}票</p>
            </div>

            {/* ACTION / RESULTS */}
            {user ? (
              myPrediction ? (
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <p className="text-xs text-slate-400">あなたは予想登録済みです</p>
                  <p className="text-lg font-black mt-1 text-white">
                    あなたの予想： <span className={myPrediction === selectedMatch.fighter1 ? 'text-blue-400' : 'text-red-400'}>{myPrediction}</span>
                  </p>
                </div>
              ) : (
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleVote(selectedMatch.fighter1)}
                    disabled={isVoting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {selectedMatch.fighter1} の勝利を予想
                  </button>
                  <button
                    onClick={() => handleVote(selectedMatch.fighter2)}
                    disabled={isVoting}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl transition duration-200 active:scale-95 disabled:opacity-50"
                  >
                    {selectedMatch.fighter2} の勝利を予想
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={handleLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition duration-200 active:scale-95"
              >
                Googleログインして予想に参加する
              </button>
            )}
          </div>

        </section>

      </div>
    </main>
  )
}
