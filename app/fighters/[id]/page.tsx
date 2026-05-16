'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Fighter } from '@/types'

interface RadarStat {
  key: 'striking' | 'grappling' | 'submission' | 'stamina' | 'power' | 'speed' | 'defense'
  label: string
  value: number
}

type RadarValues = Record<RadarStat['key'], number>

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

const getFighterImageStyle = (imageUrl: string | null) => {
  if (!imageUrl) return undefined

  return {
    backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.78)),url(${imageUrl})`,
  }
}

const getInitialRadarValues = (fighter: Fighter): RadarValues => ({
  striking: fighter.striking ?? 60,
  grappling: fighter.grappling ?? 85,
  submission: fighter.submission ?? 70,
  stamina: fighter.stamina ?? fighter.cardio ?? 75,
  power: fighter.power ?? 65,
  speed: fighter.speed ?? 70,
  defense: fighter.defense ?? fighter.durability ?? 75,
})

const profileItems = (fighter: Fighter) => [
  { label: '名前', value: fighter.name },
  { label: '出身', value: fighter.birthplace },
  { label: '生年月日', value: fighter.birth_date },
  { label: '身長', value: fighter.height },
  { label: '体重', value: fighter.weight },
  { label: '所属', value: fighter.affiliation || fighter.gym },
  { label: '階級', value: fighter.weight_class },
  { label: 'スタイル', value: fighter.base_style },
]

export default function FighterProfile() {
  const params = useParams()
  const [fighter, setFighter] = useState<Fighter | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFighter = async () => {
      if (!params?.id) return
      try {
        const { data, error } = await supabase.from('fighters').select('*').eq('id', params.id).single()

        if (error) throw error
        if (data) {
          const typedFighter = data as Fighter
          setFighter(typedFighter)
        }
      } catch (error) {
        console.error('選手データ取得失敗:', getErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }
    fetchFighter()
  }, [params?.id])

  const radarStats = useMemo<RadarStat[]>(() => {
    if (!fighter) return []

    const radarValues = getInitialRadarValues(fighter)

    return [
      { key: 'striking', label: '打撃', value: radarValues.striking },
      { key: 'power', label: 'KO力', value: radarValues.power },
      { key: 'speed', label: '速度', value: radarValues.speed },
      { key: 'grappling', label: '組み', value: radarValues.grappling },
      { key: 'submission', label: '一本', value: radarValues.submission },
      { key: 'stamina', label: '持久', value: radarValues.stamina },
      { key: 'defense', label: '防御', value: radarValues.defense },
    ]
  }, [fighter])

  const storyParagraphs = useMemo(() => {
    if (!fighter?.description) {
      return [
        '公式プロフィールの詳細テキストは未登録です。RIZIN公式インポートまたは管理画面から経歴を追加すると、ここに格闘技メディア風のストーリーとして表示されます。',
      ]
    }

    return fighter.description
      .split(/(?<=。)|\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
  }, [fighter])

  const renderRadarChart = () => {
    const size = 270
    const center = size / 2
    const radius = 84

    const points = radarStats.map((stat, index) => {
      const angle = (index * 2 * Math.PI) / radarStats.length - Math.PI / 2
      const scaledRadius = (stat.value / 100) * radius
      return {
        x: center + scaledRadius * Math.cos(angle),
        y: center + scaledRadius * Math.sin(angle),
        label: stat.label,
        value: stat.value,
        angle,
      }
    })

    const polygonPath = points.map((point) => `${point.x},${point.y}`).join(' ')
    const gridPolygons = [1, 0.75, 0.5, 0.25].map((level) =>
      radarStats
        .map((_, index) => {
          const angle = (index * 2 * Math.PI) / radarStats.length - Math.PI / 2
          const x = center + radius * level * Math.cos(angle)
          const y = center + radius * level * Math.sin(angle)
          return `${x},${y}`
        })
        .join(' '),
    )

    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[270px] w-full max-w-[310px] overflow-visible">
        {gridPolygons.map((path, index) => (
          <polygon
            key={path}
            points={path}
            fill="none"
            stroke="#2E2E2E"
            strokeDasharray={index === 0 ? 'none' : '3,3'}
            strokeWidth="1"
          />
        ))}
        {radarStats.map((_, index) => {
          const angle = (index * 2 * Math.PI) / radarStats.length - Math.PI / 2
          const x = center + radius * Math.cos(angle)
          const y = center + radius * Math.sin(angle)
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="#202020" strokeWidth="1" />
        })}
        <polygon points={polygonPath} fill="#E8002D26" stroke="#E8002D" strokeWidth="3" />
        {points.map((point) => {
          const labelX = center + (radius + 22) * Math.cos(point.angle)
          const labelY = center + (radius + 18) * Math.sin(point.angle)
          return (
            <g key={point.label}>
              <text x={labelX} y={labelY} fill="#F5F5F5" fontSize="11" fontWeight="900" textAnchor="middle">
                {point.label}
              </text>
              <text x={labelX} y={labelY + 13} fill="#FF445F" fontSize="10" fontWeight="900" textAnchor="middle">
                {point.value}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <p className="text-xl font-bold animate-pulse">選手詳細プロフィールを解析中...</p>
      </main>
    )
  }

  if (!fighter) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6">
        <p className="text-xl font-bold text-red-400">選手データが見つかりませんでした。</p>
        <Link href="/" className="mt-4 bg-[#242424] hover:bg-[#333] text-white font-bold px-6 py-3 rounded-2xl transition">
          大会TOPへ戻る
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0A0A] pb-10 text-[#F5F5F5]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,0,45,0.22),transparent_36%),linear-gradient(180deg,rgba(20,0,8,0.8),rgba(10,10,10,0)_32%)]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <Link href="/" className="mb-5 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition active:scale-95">
          ← 大会トップへ戻る
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#141414] shadow-[0_30px_120px_rgba(0,0,0,0.52)]">
          <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
            <div
              className="relative min-h-[430px] bg-[#242424] bg-cover bg-center"
              style={getFighterImageStyle(fighter.image_url)}
            >
              {!fighter.image_url && (
                <div className="absolute inset-0 flex items-center justify-center text-8xl font-black text-white/10">
                  {fighter.name.slice(0, 1)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#E8002D]">Fighter profile</p>
                <h1 className="mt-2 text-5xl font-black leading-[0.9] tracking-[-0.08em] text-white md:text-7xl">
                  {fighter.name}
                </h1>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[fighter.base_style, fighter.weight_class, fighter.organization].filter(Boolean).map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-black text-white/80">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8">
              <div className="grid grid-cols-2 gap-3">
                {profileItems(fighter).map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-black/40 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#666666]">{item.label}</p>
                    <p className="mt-1 text-sm font-black text-white">{item.value || '未登録'}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Story</p>
                <div className="mt-5">
                  {storyParagraphs.map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`} className="mb-6 text-base leading-relaxed text-gray-300 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-5 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Fighter parameters</p>
            <h2 className="mt-1 text-2xl font-black text-white">固定パラメータ</h2>
            <p className="mt-2 text-sm leading-6 text-[#AAAAAA]">
              管理画面で登録された数値を読み取り専用で表示します。比較の起点として、現在の能力バランスを確認できます。
            </p>
            <div className="mt-5">{renderRadarChart()}</div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-5 md:p-6">
            <div className="grid gap-4">
              {radarStats.map((stat) => (
                <div key={stat.key} className="rounded-3xl border border-white/10 bg-black/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-black text-white">{stat.label}</span>
                    <span className="rounded-full bg-[#E8002D]/15 px-3 py-1 text-xs font-black text-[#FF6B7F]">
                      {stat.value}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-[#E8002D]" style={{ width: `${stat.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
