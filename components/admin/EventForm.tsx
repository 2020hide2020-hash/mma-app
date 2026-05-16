'use client'

import type { FormEvent } from 'react'
import type { Event, EventFormValues } from '@/types'

interface EventFormProps {
  value: EventFormValues
  events: Event[]
  isSaving: boolean
  onChange: (value: EventFormValues) => void
  onSubmit: () => void
  onSelect: (event: Event) => void
  onCreateNew: () => void
}

export const emptyEventForm: EventFormValues = {
  name: '',
  event_date: '',
  logo_url: '',
}

export const eventToFormValues = (event: Event): EventFormValues => ({
  id: event.id,
  name: event.name,
  event_date: event.event_date ? event.event_date.slice(0, 10) : '',
  logo_url: event.logo_url ?? '',
})

export default function EventForm({
  value,
  events,
  isSaving,
  onChange,
  onSubmit,
  onSelect,
  onCreateNew,
}: EventFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#141414] p-5 shadow-2xl shadow-black/30">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Events admin</p>
          <h2 className="mt-1 text-2xl font-black text-white">大会 追加・編集</h2>
          <p className="mt-2 text-sm leading-6 text-[#AAAAAA]">大会名、開催日、ロゴ画像URLを管理します。</p>
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
              const selected = events.find((item) => item.id === Number(event.target.value))
              if (selected) onSelect(selected)
            }}
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#E8002D]"
          >
            <option value="">新規大会を作成</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-black text-[#AAAAAA]">大会名</span>
          <input
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="例: RIZIN LANDMARK 15"
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none placeholder:text-[#666666] focus:border-[#E8002D]"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-black text-[#AAAAAA]">開催日</span>
          <input
            type="date"
            value={value.event_date}
            onChange={(event) => onChange({ ...value, event_date: event.target.value })}
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none focus:border-[#E8002D]"
            required
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-black text-[#AAAAAA]">ロゴ画像URL</span>
          <input
            value={value.logo_url}
            onChange={(event) => onChange({ ...value, logo_url: event.target.value })}
            placeholder="https://..."
            className="min-h-12 rounded-2xl border border-white/10 bg-black/60 px-4 text-sm font-bold text-white outline-none placeholder:text-[#666666] focus:border-[#E8002D]"
          />
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="min-h-14 rounded-2xl bg-[#E8002D] px-5 py-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(232,0,45,0.28)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {isSaving ? '保存中...' : value.id ? '大会を更新する' : '大会を追加する'}
        </button>
      </form>
    </section>
  )
}
