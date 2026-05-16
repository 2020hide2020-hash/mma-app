'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Fighter {
  id: number
  name: string
  image_url: string | null
  organization: string | null
  weight_class: string | null
  gym: string | null
  record: string | null
  base_style: string | null
  style_tags: string[] | null
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
  youtube_id: string | null
  fighter1: Fighter
  fighter2: Fighter
}

interface PredictionRow {
  winner_fighter_id: number
  user_id: string
}

type ActiveTab = 'prediction' | 'fighters' | 'articles' | 'mypage'

const bottomTabs: Array<{
  id: ActiveTab
  label: string
  caption: string
}> = [
  { id: 'prediction', label: '大会予想', caption: 'Cards' },
  { id: 'fighters', label: '選手データ', caption: 'Database' },
  { id: 'articles', label: '記事', caption: 'Media' },
  { id: 'mypage', label: 'マイページ', caption: 'Account' },
]

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

const getFighterMeta = (fighter: Fighter) => {
  return [fighter.weight_class, fighter.record].filter(Boolean).join(' / ') || 'FIGHTER DATA'
}

const getAvatarStyle = (imageUrl: string | null) => {
  if (!imageUrl) return undefined

  return {
    backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0) 20%, rgba(10,10,10,0.88) 100%), url(${imageUrl})`,
  }
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [allFighters, setAllFighters] = useState<Fighter[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [votes, setVotes] = useState({ fighter1Count: 0, fighter2Count: 0 })
  const [myPredictionId, setMyPredictionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVoting, setIsVoting] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('prediction')
  const [fighterSearch, setFighterSearch] = useState('')

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const initData = async () => {
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false })

        if (eventError) throw eventError

        if (eventData && eventData.length > 0) {
          setEvents(eventData)
          setSelectedEventId(eventData[0].id)
        }

        const { data: fighterData, error: fighterError } = await supabase
          .from('fighters')
          .select('*')
          .order('name', { ascending: true })

        if (fighterError) throw fighterError
        if (fighterData) setAllFighters(fighterData)
      } catch (error) {
        console.error('初期ロードエラー:', getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [])

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
          setSelectedMatch(typedMatches[0])
        } else {
          setMatches([])
          setSelectedMatch(null)
        }
      } catch (error) {
        console.error('試合データ取得エラー:', getErrorMessage(error))
      }
    }

    fetchMatches()
  }, [selectedEventId])

  const fetchPredictions = useCallback(async (currentMatch: Match, currentUser: User | null) => {
    try {
      const { data: allVotes, error: votesError } = await supabase
        .from('predictions')
        .select('winner_fighter_id, user_id')
        .eq('match_id', currentMatch.id)

      if (votesError) throw votesError

      const predictionRows = (allVotes ?? []) as PredictionRow[]
      const f1Count = predictionRows.filter((v) => v.winner_fighter_id === currentMatch.fighter1.id).length
      const f2Count = predictionRows.filter((v) => v.winner_fighter_id === currentMatch.fighter2.id).length
      setVotes({ fighter1Count: f1Count, fighter2Count: f2Count })

      if (currentUser) {
        const userVote = predictionRows.find((v) => v.user_id === currentUser.id)
        setMyPredictionId(userVote ? userVote.winner_fighter_id : null)
      } else {
        setMyPredictionId(null)
      }
    } catch (error) {
      console.error('予想データ取得エラー:', getErrorMessage(error))
    }
  }, [])

  useEffect(() => {
    if (selectedMatch) {
      // Supabase is the external source of truth for live prediction counts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchPredictions(selectedMatch, user)
    }
  }, [fetchPredictions, selectedMatch, user])

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
      const { error } = await supabase.from('predictions').insert([
        {
          user_id: user.id,
          match_id: selectedMatch.id,
          winner_fighter_id: fighterId,
        },
      ])

      if (error) throw error

      await fetchPredictions(selectedMatch, user)
      alert(`${fighterName} の勝利予想を登録しました。`)
    } catch (error) {
      alert('投票に失敗しました: ' + getErrorMessage(error))
    } finally {
      setIsVoting(false)
    }
  }

  const handleShare = () => {
    if (!selectedMatch || !myPredictionId) return

    const predictedName =
      myPredictionId === selectedMatch.fighter1.id ? selectedMatch.fighter1.name : selectedMatch.fighter2.name
    const text = `私は ${predictedName} 勝利を予想。${selectedMatch.fighter1.name} vs ${selectedMatch.fighter2.name} の勝敗予想に参加しよう。`
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  const renderRadarChart = (fighter: Fighter, color: string) => {
    const size = 170
    const center = size / 2
    const radius = 52

    const stats = [
      { label: '打撃', val: fighter.striking },
      { label: 'KO', val: fighter.power },
      { label: '組み', val: fighter.wrestling },
      { label: '寝技', val: fighter.grappling },
      { label: '持久', val: fighter.cardio },
      { label: '耐久', val: fighter.durability },
      { label: 'IQ', val: fighter.iq },
    ]

    const points = stats.map((stat, i) => {
      const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
      const r = (stat.val / 100) * radius
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        label: stat.label,
        maxVal: stat.val,
      }
    })

    const polygonPath = points.map((p) => `${p.x},${p.y}`).join(' ')
    const gridPolygons = [1, 0.75, 0.5, 0.25].map((level) =>
      stats
        .map((_, i) => {
          const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
          const r = radius * level
          const x = center + r * Math.cos(angle)
          const y = center + r * Math.sin(angle)
          return `${x},${y}`
        })
        .join(' '),
    )

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[132px] w-full max-w-[150px] overflow-visible md:h-[170px] md:max-w-[170px]">
        {gridPolygons.map((path, i) => (
          <polygon
            key={path}
            points={path}
            fill="none"
            stroke="#2E2E2E"
            strokeDasharray={i === 0 ? 'none' : '3,3'}
            strokeWidth="0.7"
          />
        ))}
        {stats.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
          const x = center + radius * Math.cos(angle)
          const y = center + radius * Math.sin(angle)
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#202020" strokeWidth="1" />
        })}
        <polygon points={polygonPath} fill={`${color}20`} stroke={color} strokeWidth="2.4" />
        {points.map((p, i) => {
          const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
          const labelX = center + (radius + 15) * Math.cos(angle)
          const labelY = center + (radius + 13) * Math.sin(angle)
          return (
            <g key={p.label}>
              <text
                x={labelX}
                y={labelY}
                fill="#AAAAAA"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.label}
              </text>
              <text
                x={labelX}
                y={labelY + 10}
                fill={color}
                fontSize="8"
                fontWeight="900"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.maxVal}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const renderCompactStats = (fighter: Fighter, color: string) => {
    const stats = [
      { label: '打撃', val: fighter.striking },
      { label: 'KO', val: fighter.power },
      { label: '組み', val: fighter.wrestling },
      { label: '寝技', val: fighter.grappling },
      { label: '持久', val: fighter.cardio },
      { label: '耐久', val: fighter.durability },
      { label: 'IQ', val: fighter.iq },
    ]

    return (
      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-black text-[#AAAAAA]">{stat.label}</span>
              <span className="text-[10px] font-black" style={{ color }}>
                {stat.val}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${stat.val}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <span className="mb-4 h-2 w-16 rounded-full bg-[#E8002D] shadow-[0_0_32px_rgba(232,0,45,0.55)]" />
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#E8002D]">Fight data loading</p>
          <h1 className="mt-3 text-2xl font-black">大会情報を読み込み中</h1>
          <p className="mt-2 text-sm text-[#AAAAAA]">カード、投票状況、選手データを同期しています。</p>
        </div>
      </main>
    )
  }

  if (events.length === 0) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[#E8002D]">No event</p>
          <h1 className="mt-3 text-2xl font-black">大会データがまだありません</h1>
          <p className="mt-2 text-sm text-[#AAAAAA]">Supabase に events / matches / fighters を登録してください。</p>
        </div>
      </main>
    )
  }

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0]
  const totalVotes = votes.fighter1Count + votes.fighter2Count
  const percentF1 = totalVotes > 0 ? Math.round((votes.fighter1Count / totalVotes) * 100) : 50
  const percentF2 = totalVotes > 0 ? Math.round((votes.fighter2Count / totalVotes) * 100) : 50
  const filteredFighters = allFighters.filter((fighter) => {
    const keyword = fighterSearch.trim().toLowerCase()
    if (!keyword) return true

    return [fighter.name, fighter.organization, fighter.weight_class, fighter.gym, fighter.base_style]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword))
  })
  const predictedFighter =
    selectedMatch && myPredictionId
      ? myPredictionId === selectedMatch.fighter1.id
        ? selectedMatch.fighter1
        : selectedMatch.fighter2
      : null

  const renderVoteActions = (compact = false) => {
    if (!selectedMatch) return null

    if (!user) {
      return (
        <button
          onClick={handleLogin}
          className="min-h-14 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#0A0A0A] shadow-[0_18px_44px_rgba(255,255,255,0.12)] transition active:scale-[0.98]"
        >
          Googleログインして予想する
        </button>
      )
    }

    if (myPredictionId && predictedFighter) {
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-[#E8002D]/35 bg-[#E8002D]/10 px-4 py-3 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF6B7F]">Prediction locked</p>
            <p className="mt-1 text-base font-black text-white">
              あなたの予想: <span className="text-[#FF445F]">{predictedFighter.name}</span>
            </p>
          </div>
          <button
            onClick={handleShare}
            className="min-h-14 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 active:scale-[0.98]"
          >
            Xでシェア
          </button>
        </div>
      )
    }

    return (
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
        <button
          onClick={() => handleVote(selectedMatch.fighter1.id, selectedMatch.fighter1.name)}
          disabled={isVoting}
          className="min-h-14 rounded-2xl border border-[#2D6BFF]/50 bg-gradient-to-br from-[#245DFF] to-[#14307A] px-4 py-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(36,93,255,0.24)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectedMatch.fighter1.name}
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">勝利を予想</span>
        </button>
        <button
          onClick={() => handleVote(selectedMatch.fighter2.id, selectedMatch.fighter2.name)}
          disabled={isVoting}
          className="min-h-14 rounded-2xl border border-[#E8002D]/60 bg-gradient-to-br from-[#E8002D] to-[#740014] px-4 py-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(232,0,45,0.26)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectedMatch.fighter2.name}
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">勝利を予想</span>
        </button>
      </div>
    )
  }

  const renderHeroFighterCard = (fighter: Fighter, side: 'left' | 'right') => (
    <Link
      href={`/fighters/${fighter.id}`}
      className="group relative min-h-[228px] min-w-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#242424] bg-cover bg-center p-2.5 transition hover:border-[#E8002D]/60 active:scale-[0.99] md:min-h-[360px] md:rounded-[1.4rem] md:p-5"
      style={getAvatarStyle(fighter.image_url)}
    >
      {!fighter.image_url && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle,rgba(232,0,45,0.22),rgba(20,20,20,0.95))] text-6xl font-black text-white/15 md:text-7xl">
          {fighter.name.slice(0, 1)}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/15" />
      <div className={`relative flex h-full flex-col justify-end ${side === 'right' ? 'items-end text-right' : ''}`}>
        <p
          className={`text-[9px] font-black uppercase tracking-[0.18em] md:text-[10px] md:tracking-[0.22em] ${
            side === 'left' ? 'text-[#8AA8FF]' : 'text-[#FF6B7F]'
          }`}
        >
          {side === 'left' ? 'Blue corner' : 'Red corner'}
        </p>
        <h4 className="mt-1 max-w-full break-words text-[clamp(1rem,4.7vw,1.42rem)] font-black leading-[0.98] tracking-[-0.05em] text-white [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:mt-2 md:text-5xl md:[-webkit-line-clamp:4]">
          {fighter.name}
        </h4>
        <p className="mt-2 max-w-full text-[9px] font-bold leading-snug text-[#C8C8C8] [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:mt-3 md:text-sm">
          {getFighterMeta(fighter)}
        </p>
        <div className={`mt-2 flex max-w-full flex-wrap gap-1 ${side === 'right' ? 'justify-end' : ''} md:mt-4 md:gap-1.5`}>
          {(fighter.style_tags ?? []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="hidden max-w-full truncate rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/80 min-[390px]:inline-block md:px-2 md:py-1 md:text-[10px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0A] pb-28 text-[#F5F5F5] md:pb-0">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,0,45,0.18),transparent_34%),linear-gradient(180deg,rgba(20,0,8,0.9)_0%,rgba(10,10,10,0)_30%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-24 border-b border-white/10 bg-[#0A0A0A]/70 backdrop-blur-xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="h-11 w-11 shrink-0 rounded-full border border-[#E8002D]/50 bg-black bg-cover bg-center shadow-[0_0_24px_rgba(232,0,45,0.35)] md:h-14 md:w-14"
            style={{ backgroundImage: 'url(/brand/logo.png)' }}
          />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#E8002D] md:tracking-[0.35em]">
              Kakutou OS
            </p>
            <h1 className="mt-1 truncate text-base font-black tracking-tight text-white md:text-xl">
              MMA Prediction Arena
            </h1>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-full bg-[#242424] bg-cover bg-center"
              style={
                typeof user.user_metadata?.avatar_url === 'string'
                  ? { backgroundImage: `url(${user.user_metadata.avatar_url})` }
                  : undefined
              }
            />
            <button onClick={handleLogout} className="px-2 text-xs font-bold text-[#AAAAAA] transition hover:text-white">
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="rounded-full border border-white/15 bg-white px-4 py-2 text-xs font-black text-[#0A0A0A] transition active:scale-95"
          >
            LOGIN
          </button>
        )}
      </header>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 md:px-8">
        <section className="pt-6 md:pt-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-[#E8002D]">Tonight&apos;s fight card</p>
              <h2 className="mt-3 text-3xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                予想が熱狂を
                <br />
                作り出す。
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#AAAAAA] md:text-base">
                試合前の空気、選手データ、ファンの目利きをひとつの画面に集約。まずは直感で勝者を選び、世論と比較しよう。
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#141414]/80 p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-[#666666]">
                Event select
              </label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
                className="w-full min-w-0 rounded-2xl border border-[#2E2E2E] bg-[#0A0A0A] px-4 py-3 text-sm font-black text-white outline-none transition focus:border-[#E8002D] md:min-w-72"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {activeTab === 'prediction' && (selectedMatch ? (
          <>
            <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414]/90 p-3 shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:mt-12 md:p-5">
              <div className="rounded-[1.65rem] border border-[#E8002D]/25 bg-[linear-gradient(135deg,rgba(232,0,45,0.18),rgba(36,36,36,0.72)_42%,rgba(10,10,10,0.96))] p-4 md:p-8">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF6B7F]">Main prediction</p>
                    <h3 className="mt-1 text-lg font-black text-white md:text-2xl">{currentEvent.name}</h3>
                  </div>
                  <div className="rounded-full border border-[#E8002D]/30 bg-[#E8002D]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FF6B7F]">
                    Live odds
                  </div>
                </div>

                <div className="relative grid grid-cols-2 items-stretch gap-2 md:gap-6">
                  {renderHeroFighterCard(selectedMatch.fighter1, 'left')}

                  {renderHeroFighterCard(selectedMatch.fighter2, 'right')}

                  <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center">
                    <span className="rounded-full border border-white/20 bg-black/95 px-2.5 py-3 text-[11px] font-black text-[#E8002D] shadow-[0_0_36px_rgba(232,0,45,0.45)] md:px-4 md:py-5 md:text-lg">
                      VS
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-black/55 p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#666666]">Fan prediction</p>
                      <p className="mt-1 text-sm font-black text-white">今のファン世論</p>
                    </div>
                    <p className="text-xs font-bold text-[#AAAAAA]">総予想 {totalVotes}票</p>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3 text-xs font-black">
                    <p className="text-[#8AA8FF]">
                      {selectedMatch.fighter1.name} {percentF1}%
                    </p>
                    <p className="text-right text-[#FF6B7F]">
                      {selectedMatch.fighter2.name} {percentF2}%
                    </p>
                  </div>
                  <div className="flex h-5 overflow-hidden rounded-full bg-[#242424] ring-1 ring-white/10">
                    <div
                      className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] transition-all duration-500"
                      style={{ width: `${percentF1}%` }}
                    />
                    <div
                      className="bg-gradient-to-r from-[#FB7185] to-[#E8002D] transition-all duration-500"
                      style={{ width: `${percentF2}%` }}
                    />
                  </div>

                  <div className="mt-5">{renderVoteActions()}</div>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Fight card</p>
                  <h3 className="mt-1 text-xl font-black text-white">カードを切り替える</h3>
                </div>
                <span className="text-xs font-bold text-[#666666]">{matches.length} bouts</span>
              </div>

              {matches.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#141414] p-8 text-center text-sm text-[#AAAAAA]">
                  対戦カードがまだ未登録です。
                </div>
              ) : (
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                  {matches.map((match, index) => {
                    const isActive = selectedMatch.id === match.id
                    return (
                      <button
                        key={match.id}
                        onClick={() => setSelectedMatch(match)}
                        className={`min-w-[78vw] rounded-3xl border p-4 text-left transition active:scale-[0.99] md:min-w-0 ${
                          isActive
                            ? 'border-[#E8002D] bg-[#E8002D]/12 shadow-[0_20px_56px_rgba(232,0,45,0.16)]'
                            : 'border-white/10 bg-[#141414] hover:border-white/20'
                        }`}
                      >
                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#666666]">
                          Bout {String(index + 1).padStart(2, '0')}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-white">{match.fighter1.name}</span>
                          <span className="rounded-full bg-black px-2 py-1 text-[10px] font-black text-[#E8002D]">VS</span>
                          <span className="text-right text-sm font-black text-white">{match.fighter2.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Deep analysis</p>
                    <h3 className="mt-1 text-xl font-black text-white">選手パラメータ比較</h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-[#AAAAAA]">
                    TAP TO WIKI
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  {[selectedMatch.fighter1, selectedMatch.fighter2].map((fighter, index) => (
                    <Link
                      key={fighter.id}
                      href={`/fighters/${fighter.id}`}
                      className="min-w-0 rounded-3xl border border-white/10 bg-[#0F0F0F] p-3 transition hover:border-[#E8002D]/50 md:p-4"
                    >
                      <div className="mb-3 flex flex-col gap-2 md:mb-4 md:flex-row md:items-center md:gap-3">
                        <div
                          className="h-12 w-12 rounded-2xl bg-[#242424] bg-cover bg-center md:h-14 md:w-14"
                          style={getAvatarStyle(fighter.image_url)}
                        />
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
                            {fighter.gym || 'Unknown gym'}
                          </p>
                          <h4 className="break-words text-sm font-black leading-tight text-white md:text-lg">
                            {fighter.name}
                          </h4>
                        </div>
                      </div>
                      <div className="md:hidden">{renderCompactStats(fighter, index === 0 ? '#5C7CFF' : '#E8002D')}</div>
                      <div className="hidden md:block">{renderRadarChart(fighter, index === 0 ? '#5C7CFF' : '#E8002D')}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {selectedMatch.youtube_id && (
                  <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#E8002D] shadow-[0_0_18px_rgba(232,0,45,0.9)]" />
                      <h3 className="text-sm font-black text-white">公式映像で文脈を見る</h3>
                    </div>
                    <div className="aspect-video overflow-hidden rounded-[1.4rem] bg-black">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${selectedMatch.youtube_id}`}
                        title="Official promo"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Fighter index</p>
                  <h3 className="mt-1 text-xl font-black text-white">選手名鑑</h3>
                  <div className="mt-4 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {allFighters.map((fighter) => (
                      <Link
                        key={fighter.id}
                        href={`/fighters/${fighter.id}`}
                        className="truncate rounded-2xl border border-white/10 bg-black/45 px-3 py-2.5 text-xs font-bold text-[#AAAAAA] transition hover:border-[#E8002D]/50 hover:text-white"
                      >
                        {fighter.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414] p-10 text-center">
            <p className="text-sm font-bold text-[#AAAAAA]">この大会にはまだ対戦カードが登録されていません。</p>
          </section>
        ))}

        {activeTab === 'fighters' && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414] p-5 md:p-8">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Fighter database</p>
              <h3 className="mt-1 text-2xl font-black text-white">選手データ</h3>
              <p className="mt-2 text-sm leading-6 text-[#AAAAAA]">
                選手名、所属、階級、スタイルから検索できます。大会予想タブの選手カードからも詳細ページへ移動できます。
              </p>
            </div>

            <input
              value={fighterSearch}
              onChange={(event) => setFighterSearch(event.target.value)}
              placeholder="選手名・ジム・階級で検索"
              className="mb-4 w-full rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-[#666666] focus:border-[#E8002D]"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFighters.map((fighter) => (
                <Link
                  key={fighter.id}
                  href={`/fighters/${fighter.id}`}
                  className="flex min-w-0 items-center gap-3 rounded-3xl border border-white/10 bg-black/45 p-3 transition hover:border-[#E8002D]/50 active:scale-[0.99]"
                >
                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl bg-[#242424] bg-cover bg-center"
                    style={getAvatarStyle(fighter.image_url)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-[#666666]">
                      {fighter.weight_class || fighter.organization || 'Fighter'}
                    </p>
                    <h4 className="truncate text-base font-black text-white">{fighter.name}</h4>
                    <p className="truncate text-xs font-bold text-[#AAAAAA]">{fighter.base_style || fighter.gym}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'articles' && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414] p-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Articles</p>
            <h3 className="mt-2 text-2xl font-black text-white">記事タブ</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#AAAAAA]">
              試合展望、選手インタビュー、予想コラムを配信するためのタブです。記事コンテンツは今後ここに配置します。
            </p>
          </section>
        )}

        {activeTab === 'mypage' && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414] p-5 md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">My page</p>
            <h3 className="mt-1 text-2xl font-black text-white">マイページ</h3>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/45 p-5">
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-14 w-14 rounded-full bg-[#242424] bg-cover bg-center"
                      style={
                        typeof user.user_metadata?.avatar_url === 'string'
                          ? { backgroundImage: `url(${user.user_metadata.avatar_url})` }
                          : undefined
                      }
                    />
                    <div>
                      <p className="text-xs font-bold text-[#AAAAAA]">ログイン中</p>
                      <p className="text-base font-black text-white">
                        {typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleShare}
                      disabled={!predictedFighter}
                      className="min-h-14 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition active:scale-[0.98] disabled:opacity-45"
                    >
                      予想をSNSでシェア
                    </button>
                    <button
                      onClick={handleLogout}
                      className="min-h-14 rounded-2xl border border-[#E8002D]/35 bg-[#E8002D]/10 px-5 py-3 text-sm font-black text-[#FF6B7F] transition active:scale-[0.98]"
                    >
                      ログアウト
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-[#AAAAAA]">
                    Googleログインすると、勝敗予想の登録とSNSシェア導線を利用できます。
                  </p>
                  <button
                    onClick={handleLogin}
                    className="min-h-14 w-full rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#0A0A0A] transition active:scale-[0.98]"
                  >
                    Googleログイン
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0A0A0A]/94 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_42px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1">
          {bottomTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-14 rounded-2xl px-1.5 py-2 text-center transition active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#E8002D] text-white shadow-[0_0_28px_rgba(232,0,45,0.35)]'
                    : 'bg-white/[0.04] text-[#AAAAAA]'
                }`}
              >
                <span className="block text-[10px] font-black leading-tight">{tab.label}</span>
                <span className={`mt-0.5 block text-[8px] font-black uppercase tracking-[0.12em] ${isActive ? 'text-white/75' : 'text-[#666666]'}`}>
                  {tab.caption}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </main>
  )
}
