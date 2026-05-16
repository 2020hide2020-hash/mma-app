'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

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
}

interface Match {
  id: number
  fighter1: Fighter
  fighter2: Fighter
}

interface MatchCardProps {
  match: Match
  eventName: string
  totalVotes: number
  percentF1: number
  percentF2: number
  actionSlot: ReactNode
}

const getFighterMeta = (fighter: Fighter) => {
  return [fighter.weight_class, fighter.record].filter(Boolean).join(' / ') || fighter.organization || 'FIGHTER'
}

const getFighterBackground = (imageUrl: string | null) => {
  if (!imageUrl) return undefined

  return {
    backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.04) 0%, rgba(10,10,10,0.24) 40%, rgba(10,10,10,0.94) 100%), url(${imageUrl})`,
  }
}

const FighterPanel = ({ fighter, corner }: { fighter: Fighter; corner: 'blue' | 'red' }) => {
  const isRedCorner = corner === 'red'

  return (
    <Link
      href={`/fighters/${fighter.id}`}
      className={`group relative flex min-h-[238px] min-w-0 overflow-hidden rounded-[1.35rem] border bg-[#171717] bg-cover bg-center transition active:scale-[0.985] md:min-h-[380px] ${
        isRedCorner
          ? 'border-[#E8002D]/40 shadow-[inset_0_0_0_1px_rgba(232,0,45,0.08)]'
          : 'border-[#4F73FF]/35 shadow-[inset_0_0_0_1px_rgba(79,115,255,0.08)]'
      }`}
      style={getFighterBackground(fighter.image_url)}
    >
      {!fighter.image_url && (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(232,0,45,0.22),rgba(15,15,15,0.96))] text-7xl font-black text-white/10">
          {fighter.name.slice(0, 1)}
        </div>
      )}

      <div
        className={`absolute inset-y-0 w-14 ${
          isRedCorner
            ? 'right-0 bg-gradient-to-l from-[#E8002D]/28 to-transparent'
            : 'left-0 bg-gradient-to-r from-[#245DFF]/24 to-transparent'
        }`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.22),transparent_35%,rgba(0,0,0,0.22))]" />

      <div className={`relative flex h-full w-full flex-col justify-between p-3 md:p-5 ${isRedCorner ? 'items-end text-right' : ''}`}>
        <div className={`flex w-full items-start ${isRedCorner ? 'justify-end' : 'justify-start'}`}>
          <span
            className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] md:text-[10px] ${
              isRedCorner
                ? 'border-[#E8002D]/40 bg-[#E8002D]/14 text-[#FF6B7F]'
                : 'border-[#4F73FF]/35 bg-[#245DFF]/14 text-[#9DB3FF]'
            }`}
          >
            {isRedCorner ? 'Red' : 'Blue'}
          </span>
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/55 md:text-[10px]">
            {fighter.gym || fighter.base_style || 'Fighter data'}
          </p>
          <h3 className="max-w-full break-words text-[clamp(1.08rem,4.9vw,1.55rem)] font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.9)] [display:-webkit-box] [overflow-wrap:anywhere] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] md:text-5xl md:[-webkit-line-clamp:4]">
            {fighter.name}
          </h3>
          <p className="mt-2 max-w-full text-[9px] font-bold leading-snug text-white/75 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] md:text-sm">
            {getFighterMeta(fighter)}
          </p>
          <div className={`mt-2 flex max-w-full flex-wrap gap-1 ${isRedCorner ? 'justify-end' : ''}`}>
            {(fighter.style_tags ?? []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="hidden max-w-full truncate rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/75 min-[390px]:inline-block md:px-2 md:py-1 md:text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MatchCard({
  match,
  eventName,
  totalVotes,
  percentF1,
  percentF2,
  actionSlot,
}: MatchCardProps) {
  return (
    <section className="mt-7 rounded-[2rem] border border-white/10 bg-[#111111]/95 p-2.5 shadow-[0_30px_120px_rgba(0,0,0,0.5)] md:mt-12 md:p-5">
      <div className="overflow-hidden rounded-[1.7rem] border border-[#E8002D]/25 bg-[radial-gradient(circle_at_50%_0%,rgba(232,0,45,0.24),rgba(20,20,20,0.86)_42%,rgba(5,5,5,0.98)_100%)] p-3 md:p-8">
        <div className="mb-4 flex items-start justify-between gap-3 md:mb-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FF6B7F]">Main prediction</p>
            <h2 className="mt-1 truncate text-base font-black text-white md:text-2xl">{eventName}</h2>
          </div>
          <div className="shrink-0 rounded-full border border-[#E8002D]/30 bg-[#E8002D]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#FF6B7F] md:text-[10px]">
            Live odds
          </div>
        </div>

        <div className="relative grid grid-cols-2 items-stretch gap-2 md:gap-6">
          <FighterPanel fighter={match.fighter1} corner="blue" />
          <FighterPanel fighter={match.fighter2} corner="red" />

          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/95 text-[11px] font-black text-[#E8002D] shadow-[0_0_36px_rgba(232,0,45,0.45)] ring-4 ring-black/55 md:h-20 md:w-20 md:text-lg">
              VS
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/62 p-3 md:mt-5 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#666666] md:text-[10px]">
                Fan prediction
              </p>
              <p className="mt-1 text-sm font-black text-white">今のファン世論</p>
            </div>
            <p className="shrink-0 text-xs font-bold text-[#AAAAAA]">総予想 {totalVotes}票</p>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3 text-[11px] font-black md:text-xs">
            <p className="min-w-0 truncate text-[#8AA8FF]">
              {match.fighter1.name} {percentF1}%
            </p>
            <p className="min-w-0 truncate text-right text-[#FF6B7F]">
              {match.fighter2.name} {percentF2}%
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

          <div className="mt-4 md:mt-5">{actionSlot}</div>
        </div>
      </div>
    </section>
  )
}
