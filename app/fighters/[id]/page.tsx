'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

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

export default function FighterProfile() {
  const params = useParams()
  const [fighter, setFighter] = useState<Fighter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFighter = async () => {
      if (!params?.id) return
      try {
        const { data, error } = await supabase
          .from('fighters')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        if (data) {
          setFighter(data as Fighter)
        }
      } catch (error) {
        console.error('選手データ取得失敗:', getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    fetchFighter()
  }, [params?.id])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">選手詳細プロフィールを解析中...</p>
      </main>
    )
  }

  if (!fighter) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <p className="text-xl font-bold text-red-400">選手データが見つかりませんでした。</p>
        <Link href="/" className="mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2 rounded-xl transition">
          大会TOPへ戻る
        </Link>
      </main>
    )
  }

  // :triangular_ruler: 7角形レーダーチャート
  const renderRadarChart = (fighter: Fighter) => {
    const size = 260
    const center = size / 2
    const radius = 80

    const stats = [
      { label: '打撃力', val: fighter.striking },
      { label: 'KO力', val: fighter.power },
      { label: '組み技', val: fighter.wrestling },
      { label: '寝技・極め', val: fighter.grappling },
      { label: 'スタミナ', val: fighter.cardio },
      { label: '打たれ強さ', val: fighter.durability },
      { label: 'FIGHT IQ', val: fighter.iq }
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
      <svg width={size} height={size} className="overflow-visible">
        {gridPolygons.map((path, i) => (
          <polygon key={i} points={path} fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray={i === 0 ? 'none' : '2,2'} />
        ))}
        {stats.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
          const x = center + radius * Math.cos(angle)
          const y = center + radius * Math.sin(angle)
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#1E293B" strokeWidth="1" />
        })}
        <polygon points={polygonPath} fill="#10b98115" stroke="#10B981" strokeWidth="2.5" />
        {points.map((p, i) => {
          const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2
          const labelX = center + (radius + 20) * Math.cos(angle)
          const labelY = center + (radius + 14) * Math.sin(angle)
          return (
            <g key={i}>
              <text x={labelX} y={labelY} fill="#94A3B8" fontSize="11" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">{p.label}</text>
              <text x={labelX} y={labelY + 11} fill="#10B981" fontSize="10" fontWeight="black" textAnchor="middle" alignmentBaseline="middle">{p.maxVal}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition flex items-center mb-6">
          ← 大会トップへ戻る
        </Link>

        {/* HERO BANNER & PROFILE CARD */}
        <div className="bg-slate-900 rounded-3xl border border-slate-900 p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
          <div className="flex flex-col items-center">
            {fighter.image_url ? (
              <div
                role="img"
                aria-label={fighter.name}
                className="w-40 h-40 rounded-full bg-cover bg-center border-4 border-slate-700 shadow-2xl"
                style={{ backgroundImage: `url(${fighter.image_url})` }}
              />
            ) : (
              <div className="w-40 h-40 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border-4 border-slate-700">No Image</div>
            )}
            <h2 className="text-3xl font-black text-white mt-4">{fighter.name}</h2>
            <span className="text-sm text-emerald-400 font-bold mt-1 bg-emerald-400/10 px-3 py-1 rounded-full">{fighter.base_style}</span>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-400 border-b border-slate-800 pb-2">選手スペック / PROFILE</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">主戦場 / ORGANIZATION</span>
                <span className="font-bold text-white text-base">{fighter.organization}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">所属ジム / GYM</span>
                <span className="font-bold text-white text-base">{fighter.gym}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">現在の階級 / WEIGHT CLASS</span>
                <span className="font-bold text-white text-base">{fighter.weight_class}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">プロ戦績 / CAREER RECORD</span>
                <span className="font-bold text-white text-base">{fighter.record}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs text-slate-500 block">ファイティングスタイル・特徴タグ</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {fighter.style_tags?.map((t, idx) => (
                  <span key={idx} className="text-xs bg-slate-950 text-slate-400 border border-slate-800 px-3 py-1 rounded-lg font-semibold">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* STATS VISUALIZATION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="bg-slate-900 rounded-3xl border border-slate-900 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-wider">パラメータバランス</h3>
            {renderRadarChart(fighter)}
          </div>

          <div className="md:col-span-2 bg-slate-900 rounded-3xl border border-slate-900 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-slate-400 border-b border-slate-800 pb-2 mb-4">選手詳細データベース（考察用）</h3>

            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-xs text-emerald-400 font-bold block mb-1">【CTO/PM MEMO】今後の拡張案</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  この選手Wikiページには、今後「過去の大会の投票勝率」や「ユーザーが考えるこの選手の強み投稿欄（Reddit風掲示板）」を設置します。
                  各パラメータ数値に対して、ユーザーが「いや、平本のテイクダウンディフェンスは今もっと上がっているはずだから、レスリングは78が妥当」といった投票を行い、ユーザー全体の平均値を別パラメーターとして動的に算出して表示する仕組みなども構築可能です。
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-xs text-slate-500 font-bold block mb-1">直近3試合の戦績推移</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  データ準備中...（試合マスタ `matches` から過去戦績を逆引きして自動表示させるクエリにPhase 3でアップグレードします）
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
