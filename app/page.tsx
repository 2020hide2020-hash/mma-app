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
  const [event, setEvent] = useState<Event | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
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

  // 2. データ取得
  const fetchEventData = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (eventError) throw eventError
      if (eventData) {
        setEvent(eventData)

        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            fighter1:fighters!fighter1_id(*),
            fighter2:fighters!fighter2_id(*)
          `)
          .eq('event_id', eventData.id)
          .order('id', { ascending: true })

        if (matchesError) throw matchesError
        if (matchesData && matchesData.length > 0) {
          const typedMatches = matchesData as unknown as Match[]
          setMatches(typedMatches)

          if (!selectedMatch) {
            setSelectedMatch(typedMatches[0])
            await fetchPredictions(typedMatches[0], user)
          } else {
            const currentSelected = typedMatches.find(m => m.id === selectedMatch.id) || typedMatches[0]
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

  useEffect(() => {
    if (selectedMatch) {
      fetchPredictions(selectedMatch, user)
    }
  }, [selectedMatch, user])

  useEffect(() => {
    fetchEventData()
  }, [])

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
      await fetchEventData()
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

        {/* 選手ヘッダー（顔写真付き） */}
        <div className={`w-full flex items-center space-x-3 mb-3 ${alignment === 'right' ? 'flex-row-reverse space-x-reverse' : ''}`}>
          {fighter.image_url ? (
            <img
              src={fighter.image_url}
              alt={fighter.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-700 shadow-lg"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold border-2 border-slate-700">No Image</div>
          )}
          <div className={alignment === 'right' ? 'text-right' : 'text-left'}>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">{fighter.gym}</span>
            <h4 className="text-lg font-black text-white leading-tight">{fighter.name}</h4>
            <Link
              href={`/fighters/${fighter.id}`}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline block mt-0.5"
            >
              個別Wikiを見る →
            </Link>
          </div>
        </div>

        {/* SVGグラフ */}
        <svg width={size} height={size} className="overflow-visible my-1">
          {gridPolygons.map((path, i) => (
            <polygon key={i} points={path} fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray={i === 0 ? 'none' : '2,2'} />
          ))}
          {stats.map((_, i) => {
            const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
            const x = center + radius * Math.cos(angle)
            const y = center + radius * Math.sin(angle)
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#0f172a" strokeWidth="1" />
          })}
          <polygon points={polygonPath} fill={`${color}12`} stroke={color} strokeWidth="2" />
          {points.map((p, i) => {
            const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
            const labelX = center + (radius + 14) * Math.cos(angle)
            const labelY = center + (radius + 11) * Math.sin(angle)
            return (
              <g key={i}>
                <text x={labelX} y={labelY} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{p.label}</text>
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

  if (loading || !event || !selectedMatch) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">試合データ、および選手パラメータを取得中...</p>
      </main>
    )
  }

  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const percentF1 = totalVotes > 0 ? Math.round((votes.fighter1Count / totalVotes) * 100) : 50
  const percentF2 = totalVotes > 0 ? Math.round((votes.fighter2Count / totalVotes) * 100) : 50

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8 relative">

      {/* GLOBAL HEADER */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">MATCHDAY ENHANCED OS</span>
          <h1 className="text-2xl font-black text-white">{event.name}</h1>
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

        {/* LEFT COLUMN: 対戦カード一覧 */}
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
                      : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    {m.id === matches[0].id ? ':fire: MAIN CARD' : ':crossed_swords: SEMI-FINAL'}
                  </div>
                  <div className="flex justify-between items-center text-white">
                    <span className="font-bold text-lg">{m.fighter1.name}</span>
                    <span className="text-xs text-slate-500 font-black px-2">VS</span>
                    <span className="font-bold text-lg text-right">{m.fighter2.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* MIDDLE & RIGHT COLUMNS */}
        <section className="lg:col-span-2 flex flex-col space-y-6">

          {/* :scales: :video_game: INDEPENDENT FIGHTER PARAMETERS */}
          <div className="bg-slate-900 rounded-3xl border border-slate-900 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 mb-6 border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>選手パラメータ比較 (FIFAスタイル)</span>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">パラメータ形状で相性を読む</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderRadarChart(selectedMatch.fighter1, '#3b82f6', 'left')}
              {renderRadarChart(selectedMatch.fighter2, '#ef4444', 'right')}
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

        </section>

      </div>
    </main>
  )
}
