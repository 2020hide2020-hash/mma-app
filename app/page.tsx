'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Fighter {
  id: number
  name: string
  image_url: string
  organization: string
  weight_class: string
  gym: string
  record: string
  base_style: string
  style_tags: string[]
  striking: number
  wrestling: number
  grappling: number
  cardio: number
  durability: number
  iq: number
  power: number
}

interface Event {
  id: number
  name: string
  event_date: string
}

interface Match {
  id: number
  event_id: number
  fighter1_id: number
  fighter2_id: number
  youtube_id: string
  fighter1: Fighter
  fighter2: Fighter
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [allFighters, setAllFighters] = useState<Fighter[]>([]) // クイック選手一覧用
  const [user, setUser] = useState<any>(null)
  const [votes, setVotes] = useState({ fighter1Count: 0, fighter2Count: 0 })
  const [myPredictionId, setMyPredictionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)

  // 1. Auth監視
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

  // 2. 初期データロード（大会一覧 & 全選手名簿の取得）
  useEffect(() => {
    const initData = async () => {
      try {
        // ① 全大会リストを取得（日付の降順：新しいものが上）
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false })

        if (eventError) throw eventError

        if (eventData && eventData.length > 0) {
          setEvents(eventData)
          setSelectedEventId(eventData[0].id) // 初期表示は一番最新の大会
        }

        // ② クイック選手名鑑用の選手マスタを取得
        const { data: fighterData, error: fighterError } = await supabase
          .from('fighters')
          .select('*')
          .order('name', { ascending: true })

        if (fighterError) throw fighterError
        if (fighterData) setAllFighters(fighterData)

      } catch (error: any) {
        console.error('初期ロードエラー:', error.message)
      } finally {
        setLoading(false)
      }
    };
    initData()
  }, [])

  // 3. 選択された大会に紐づく試合カード一覧を取得（大会切り替え時に動く）
  useEffect(() => {
    if (!selectedEventId) return

    const fetchMatches = async () => {
      try {
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            fighter1:fighters!fighter1_id(*),
            fighter2:fighters!fighter2_id(*)
          `)
          .eq('event_id', selectedEventId)
          .order('id', { ascending: true })

        if (matchesError) throw matchesError

        if (matchesData && matchesData.length > 0) {
          const typedMatches = matchesData as unknown as Match[]
          setMatches(typedMatches)
          // 試合カードの1つ目を選択状態にする
          setSelectedMatch(typedMatches[0])
        } else {
          setMatches([])
          setSelectedMatch(null)
        }
      } catch (error: any) {
        console.error('試合データ取得エラー:', error.message)
      }
    }
    fetchMatches()
  }, [selectedEventId])

  // 4. 選択された試合の「投票状況」と「自分の投票履歴」を取得
  useEffect(() => {
    if (selectedMatch) {
      fetchPredictions(selectedMatch, user)
    }
  }, [selectedMatch, user])

  const fetchPredictions = async (currentMatch: Match, currentUser: any) => {
    try {
      const { data: allVotes, error: votesError } = await supabase
        .from('predictions')
        .select('winner_fighter_id, user_id')
        .eq('match_id', currentMatch.id)

      if (votesError) throw votesError

      if (allVotes) {
        const f1Count = allVotes.filter(v => v.winner_fighter_id === currentMatch.fighter1.id).length
        const f2Count = allVotes.filter(v => v.winner_fighter_id === currentMatch.fighter2.id).length
        setVotes({ fighter1Count: f1Count, fighter2Count: f2Count })

        if (currentUser) {
          const userVote = allVotes.find(v => v.user_id === currentUser.id)
          setMyPredictionId(userVote ? userVote.winner_fighter_id : null)
        } else {
          setMyPredictionId(null)
        }
      }
    } catch (error: any) {
      console.error('予想データ取得エラー:', error.message)
    }
  }

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

  const handleVote = async (fighterId: number, fighterName: string) => {
    if (!selectedMatch || !user) return
    setIsVoting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .insert([
          {
            user_id: user.id,
            match_id: selectedMatch.id,
            winner_fighter_id: fighterId,
          },
        ])

      if (error) throw error

      alert(`${fighterName} の勝利予想を登録しました！`)

      // 投票結果をリロード
      if (selectedMatch) {
        await fetchPredictions(selectedMatch, user)
      }
    } catch (error: any) {
      alert('投票に失敗しました: ' + error.message)
    } finally {
      setIsVoting(false)
    }
  }

  // :triangular_ruler: 7角形ステータスグラフ
  const renderRadarChart = (fighter: Fighter, color: string, alignment: 'left' | 'right') => {
    const size = 180
    const center = size / 2
    const radius = 55

    const stats = [
      { label: '打撃', val: fighter.striking },
      { label: 'パワー', val: fighter.power },
      { label: '組み', val: fighter.wrestling },
      { label: '寝技', val: fighter.grappling },
      { label: 'スタミナ', val: fighter.cardio },
      { label: '耐久', val: fighter.durability },
      { label: 'IQ', val: fighter.iq }
    ]

    const points = stats.map((stat, i) => {
      const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
      const r = (stat.val / 100) * radius
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      return { x, y, label: stat.label, maxVal: stat.val }
    })

    const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ')
    const gridPolygons = [1.0, 0.75, 0.5, 0.25].map(level => {
      return stats.map((_, i) => {
        const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
        const r = radius * level
        const x = center + r * Math.cos(angle)
        const y = center + r * Math.sin(angle)
        return `${x},${y}`
      }).join(' ')
    })

    return (
      <div className="flex flex-col items-center bg-slate-950/40 p-4 rounded-2xl border border-slate-900 w-full relative overflow-hidden">

        {/* 選手ヘッダー（顔写真＆名前全体がスマートなホバーリンクに進化） */}
        <Link
          href={`/fighters/${fighter.id}`}
          className={`w-full flex items-center space-x-3 mb-3 group/fighter ${alignment === 'right' ? 'flex-row-reverse space-x-reverse' : ''}`}
        >
          {fighter.image_url ? (
            <img
              src={fighter.image_url}
              alt={fighter.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-lg group-hover/fighter:border-emerald-500 transition-all"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border-2 border-slate-700 group-hover/fighter:border-emerald-500 transition-all">No Image</div>
          )}
          <div className={alignment === 'right' ? 'text-right' : 'text-left'}>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">{fighter.gym}</span>
            <h4 className="text-lg font-black text-white leading-tight group-hover/fighter:text-emerald-400 transition-all">{fighter.name}</h4>
            <span className="text-[9px] text-slate-500 block mt-0.5">Wikiを見る ↗</span>
          </div>
        </Link>

        {/* SVGグラフ */}
        <svg width={size} height={size} className="overflow-visible my-1">
          {gridPolygons.map((path, i) => (
            <polygon key={i} points={path} fill="none" stroke="#1E293B" strokeWidth="0.5" strokeDasharray={i === 0 ? 'none' : '2,2'} />
          ))}
          {stats.map((_, i) => {
            const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
            const x = center + radius * Math.cos(angle)
            const y = center + radius * Math.sin(angle)
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#0F172A" strokeWidth="1" />
          })}
          <polygon points={polygonPath} fill={`${color}12`} stroke={color} strokeWidth="2" />
          {points.map((p, i) => {
            const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
            const labelX = center + (radius + 14) * Math.cos(angle)
            const labelY = center + (radius + 11) * Math.sin(angle)
            return (
              <g key={i}>
                <text x={labelX} y={labelY} fill="#64748B" fontSize="9" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{p.label}</text>
                <text x={labelX} y={labelY + 9} fill={color} fontSize="8" fontWeight="black" textAnchor="middle" alignmentBaseline="middle">{p.maxVal}</text>
              </g>
            )
          })}
        </svg>

        {/* タグリスト */}
        <div className="flex flex-wrap gap-1 justify-center mt-3 h-10 overflow-hidden w-full">
          {fighter.style_tags?.map((t, idx) => (
            <span key={idx} className="text-[8px] bg-slate-900/80 text-slate-400 border border-slate-950 px-2 py-0.5 rounded font-semibold">
              #{t}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (loading || events.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">大会情報および選手データを取得中...</p>
      </main>
    )
  }

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0]
  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const percentF1 = totalVotes > 0 ? Math.round((votes.fighter1Count / totalVotes) * 100) : 50
  const percentF2 = totalVotes > 0 ? Math.round((votes.fighter2Count / totalVotes) * 100) : 50

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 relative">

      {/* GLOBAL HEADER */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">MATCHDAY ENHANCED OS</span>
          <h1 className="text-2xl font-black text-white">{currentEvent.name}</h1>
        </div>

        <div>
          {user ? (
            <div className="flex items-center space-x-3 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
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

        {/* LEFT COLUMN: 大会セレクター ＆ カード一覧 */}
        <section className="lg:col-span-1 flex flex-col space-y-6">

          {/* 大会セレクター */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-900">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
              :trophy: 対象大会を選択
            </label>
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="w-full bg-slate-950 text-white font-bold py-2.5 px-3 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer text-sm transition"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* 対戦カード一覧 */}
          <div className="flex flex-col space-y-3">
            <h2 className="text-sm font-bold text-slate-400 tracking-wide border-l-4 border-emerald-400 pl-3">
              対戦カード
            </h2>
            {matches.length === 0 ? (
              <p className="text-xs text-slate-600 p-4 text-center">対戦カードがまだ未登録です</p>
            ) : (
              matches.map((m) => {
                const isActive = selectedMatch && m.id === selectedMatch.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMatch(m)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                        : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-center text-white">
                      <span className="font-bold text-sm">{m.fighter1.name}</span>
                      <span className="text-[10px] text-slate-500 font-black px-2">VS</span>
                      <span className="font-bold text-sm text-right">{m.fighter2.name}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* 選手名鑑クイックリンク */}
          <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase mb-3">選手名鑑 (クイックWiki)</h3>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {allFighters.map((f) => (
                <Link
                  key={f.id}
                  href={`/fighters/${f.id}`}
                  className="text-xs text-slate-400 hover:text-emerald-400 font-semibold p-1.5 rounded bg-slate-950/60 border border-slate-900 truncate hover:border-slate-800 transition"
                >
                  :bust_in_silhouette: {f.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* MIDDLE & RIGHT COLUMNS */}
        <section className="lg:col-span-2 flex flex-col space-y-6">

          {selectedMatch ? (
            <>
              {/* :scales: :video_game: INDEPENDENT FIGHTER PARAMETERS */}
              <div className="bg-slate-900 rounded-3xl border border-slate-900 p-6 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 mb-6 border-b border-slate-800 pb-2 flex justify-between items-center">
                  <span>選手パラメータ比較 (FIFAスタイル)</span>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">パラメータ形状で相性を読む</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderRadarChart(selectedMatch.fighter1, '#3B82F6', 'left')}
                  {renderRadarChart(selectedMatch.fighter2, '#EF4444', 'right')}
                </div>
              </div>

              {/* :movie_camera: 公式動画 */}
              {selectedMatch.youtube_id && (
                <div className="w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-900 p-4">
                  <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block mr-2 animate-pulse"></span>
                    密着動画・公式煽りVで「文脈」を理解する
                  </h3>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${selectedMatch.youtube_id}`}
                      title="Official Promo"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* :bar_chart: リアルタイム投票 */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-900 p-6 text-center">
                <h3 className="text-md font-bold text-slate-200 mb-1">
                  勝敗予想
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  {user ? 'あなたの目利きを証明してください' : '予想を投票するにはGoogleログインが必要です'}
                </p>

                <div className="mb-6">
                  <div className="flex justify-between text-sm font-bold mb-2 px-1">
                    <span className="text-blue-400">{selectedMatch.fighter1.name}: {votes.fighter1Count}票 ({percentF1}%)</span>
                    <span className="text-red-400">{selectedMatch.fighter2.name}: {votes.fighter2Count}票 ({percentF2}%)</span>
                  </div>
                  <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                    <div className="bg-blue-500 transition-all duration-500" style={{ width: `${percentF1}%` }} />
                    <div className="bg-red-500 transition-all duration-500" style={{ width: `${percentF2}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">総予想投票数: {totalVotes}票</p>
                </div>

                {user ? (
                  myPredictionId ? (
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                      <p className="text-xs text-slate-400">予想登録済みです</p>
                      <p className="text-lg font-black mt-1 text-white">
                        あなたの予想：{' '}
                        <span className={myPredictionId === selectedMatch.fighter1.id ? 'text-blue-400' : 'text-red-400'}>
                          {myPredictionId === selectedMatch.fighter1.id ? selectedMatch.fighter1.name : selectedMatch.fighter2.name}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleVote(selectedMatch.fighter1.id, selectedMatch.fighter1.name)}
                        disabled={isVoting}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition duration-200 active:scale-95 disabled:opacity-50"
                      >
                        {selectedMatch.fighter1.name} の勝利を予想
                      </button>
                      <button
                        onClick={() => handleVote(selectedMatch.fighter2.id, selectedMatch.fighter2.name)}
                        disabled={isVoting}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-2xl transition duration-200 active:scale-95 disabled:opacity-50"
                      >
                        {selectedMatch.fighter2.name} の勝利を予想
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
            </>
          ) : (
            <div className="bg-slate-900 rounded-3xl border border-slate-900 p-12 text-center text-slate-500">
              対戦カードを選択するか、新しくデータを追加してください。
            </div>
          )}

        </section>

      </div>
    </main>
  )
}
