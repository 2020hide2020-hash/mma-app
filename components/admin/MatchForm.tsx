'use client'

import type { FormEvent } from 'react'
import type { Event, Fighter, Match, MatchFormValues } from '@/types'

interface MatchFormProps {
  value: MatchFormValues
  events: Event[]
  fighters: Fighter[]
  matches: Match[]
  isSaving: boolean
  onChange: (value: MatchFormValues) => void
  onSubmit: () => void
  onSelect: (match: Match) => void
  onCreateNew: () => void
}

export const emptyMatchForm: MatchFormValues = {
  event_id: '',
  fighter1_id: '',
  fighter2_id: '',
  youtube_id: '',
  bout_order: '',
  is_main_card: false,
}

export const matchToFormValues = (match: Match): MatchFormValues => ({
  id: match.id,
  event_id: match.event_id,
  fighter1_id: match.fighter1_id,
  fighter2_id: match.fighter2_id,
  youtube_id: match.youtube_id ?? '',
  bout_order: match.bout_order ?? '',
  is_main_card: Boolean(match.is_main_card),
})

export default function MatchForm({
  value,
  events,
  fighters,
  matches,
  isSaving,
  onChange,
  onSubmit,
  onSelect,
  onCreateNew,
}: MatchFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#141414] p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Matches admin</p>
          <h2 className="mt-1 text-2xl font-black text-white">試合カード 追加・編集</h2>
          <p className="mt-2 text-sm leading-6 text-[#AAAAAA]">大会に紐づく選手A/B、試合順、メインカード設定を管理します。</p>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white transition active:scale-95"
        >
          新規
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-black text-[#AAAAAA]">編集対象</span>
          <select
            value={value.id ?? ''}
            onChange={(event) => {
              const selected = matches.find((item) => item.id === Number(event.target.value))
              if (selected) onSelect(selected)
            }}
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#E8002D]"
          >
            <option value="">新規試合カードを作成</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.fighter1?.name ?? match.fighter1_id} vs {match.fighter2?.name ?? match.fighter2_id}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-black text-[#AAAAAA]">親大会</span>
          <select
            value={value.event_id}
            onChange={(event) => onChange({ ...value, event_id: Number(event.target.value) })}
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#E8002D]"
            required
          >
            <option value="">大会を選択</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-black text-[#AAAAAA]">選手A</span>
            <select
              value={value.fighter1_id}
              onChange={(event) => onChange({ ...value, fighter1_id: Number(event.target.value) })}
              className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#245DFF]"
              required
            >
              <option value="">選手Aを選択</option>
              {fighters.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black text-[#AAAAAA]">選手B</span>
            <select
              value={value.fighter2_id}
              onChange={(event) => onChange({ ...value, fighter2_id: Number(event.target.value) })}
              className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#E8002D]"
              required
            >
              <option value="">選手Bを選択</option>
              {fighters.map((fighter) => (
                <option key={fighter.id} value={fighter.id}>
                  {fighter.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-black text-[#AAAAAA]">試合順</span>
            <input
              type="number"
              min="1"
              value={value.bout_order}
              onChange={(event) =>
                onChange({ ...value, bout_order: event.target.value ? Number(event.target.value) : '' })
              }
              placeholder="例: 1"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none placeholder:text-[#666666] focus:border-[#E8002D]"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-black text-[#AAAAAA]">YouTube ID</span>
            <input
              value={value.youtube_id}
              onChange={(event) => onChange({ ...value, youtube_id: event.target.value })}
              placeholder="例: gI_eB9A96mY"
              className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none placeholder:text-[#666666] focus:border-[#E8002D]"
            />
          </label>
        </div>

        <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/60 px-4">
          <span className="text-sm font-black text-white">メインカードとして表示</span>
          <input
            type="checkbox"
            checked={value.is_main_card}
            onChange={(event) => onChange({ ...value, is_main_card: event.target.checked })}
            className="h-5 w-5 accent-[#E8002D]"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="min-h-14 rounded-2xl bg-[#E8002D] px-5 py-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(232,0,45,0.28)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? '保存中...' : value.id ? '試合カードを更新する' : '試合カードを追加する'}
        </button>
      </form>
    </section>
  )
}
