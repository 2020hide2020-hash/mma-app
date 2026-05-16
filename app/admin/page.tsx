'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import EventForm, { emptyEventForm, eventToFormValues } from '@/components/admin/EventForm'
import MatchForm, { emptyMatchForm, matchToFormValues } from '@/components/admin/MatchForm'
import { supabase } from '@/lib/supabase'
import type { Event, EventFormValues, Fighter, Match, MatchFormValues } from '@/types'

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

const isMissingColumnError = (error: unknown) => {
  return getErrorMessage(error).includes('Could not find') || getErrorMessage(error).includes('column')
}

const toEventPayload = (form: EventFormValues) => ({
  name: form.name,
  event_date: form.event_date,
  logo_url: form.logo_url || null,
})

const toBaseEventPayload = (form: EventFormValues) => ({
  name: form.name,
  event_date: form.event_date,
})

const toMatchPayload = (form: MatchFormValues) => {
  if (!form.event_id || !form.fighter1_id || !form.fighter2_id) {
    throw new Error('大会、選手A、選手Bを選択してください')
  }

  if (form.fighter1_id === form.fighter2_id) {
    throw new Error('選手Aと選手Bには別の選手を選択してください')
  }

  return {
    event_id: form.event_id,
    fighter1_id: form.fighter1_id,
    fighter2_id: form.fighter2_id,
    youtube_id: form.youtube_id || null,
    bout_order: form.bout_order || null,
    is_main_card: form.is_main_card,
  }
}

const toBaseMatchPayload = (form: MatchFormValues) => {
  if (!form.event_id || !form.fighter1_id || !form.fighter2_id) {
    throw new Error('大会、選手A、選手Bを選択してください')
  }

  if (form.fighter1_id === form.fighter2_id) {
    throw new Error('選手Aと選手Bには別の選手を選択してください')
  }

  return {
    event_id: form.event_id,
    fighter1_id: form.fighter1_id,
    fighter2_id: form.fighter2_id,
    youtube_id: form.youtube_id || null,
  }
}

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [eventForm, setEventForm] = useState<EventFormValues>(emptyEventForm)
  const [matchForm, setMatchForm] = useState<MatchFormValues>(emptyMatchForm)
  const [loading, setLoading] = useState(true)
  const [savingTarget, setSavingTarget] = useState<'event' | 'match' | null>(null)
  const [importingRizin, setImportingRizin] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const loadAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const [eventsResult, fightersResult, matchesResult] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase.from('fighters').select('*').order('name', { ascending: true }),
        supabase
          .from('matches')
          .select(`
            *,
            fighter1:fighters!fighter1_id(*),
            fighter2:fighters!fighter2_id(*)
          `)
          .order('event_id', { ascending: true })
          .order('id', { ascending: true }),
      ])

      if (eventsResult.error) throw eventsResult.error
      if (fightersResult.error) throw fightersResult.error
      if (matchesResult.error) throw matchesResult.error

      setEvents((eventsResult.data ?? []) as Event[])
      setFighters((fightersResult.data ?? []) as Fighter[])
      const matchData = (matchesResult.data ?? []) as unknown as Match[]
      setMatches(
        matchData.sort((a, b) => {
          if (a.event_id !== b.event_id) return a.event_id - b.event_id
          return (a.bout_order ?? a.id) - (b.bout_order ?? b.id)
        }),
      )
    } catch (error) {
      setMessage(`読み込みに失敗しました: ${getErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Admin data is synchronized from Supabase on first client render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAdminData()
  }, [loadAdminData])

  const eventNameById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event.name]))
  }, [events])

  const saveEvent = async () => {
    setSavingTarget('event')
    setMessage(null)
    try {
      const payload = toEventPayload(eventForm)
      let result = eventForm.id
        ? await supabase.from('events').update(payload).eq('id', eventForm.id)
        : await supabase.from('events').insert([payload])

      if (result.error && isMissingColumnError(result.error)) {
        const basePayload = toBaseEventPayload(eventForm)
        result = eventForm.id
          ? await supabase.from('events').update(basePayload).eq('id', eventForm.id)
          : await supabase.from('events').insert([basePayload])
      }

      if (result.error) throw result.error

      setMessage(
        eventForm.id
          ? '大会を更新しました。'
          : '大会を追加しました。logo_urlを保存するにはSupabase migrationの適用が必要です。',
      )
      setEventForm(emptyEventForm)
      await loadAdminData()
    } catch (error) {
      setMessage(`大会の保存に失敗しました: ${getErrorMessage(error)}`)
    } finally {
      setSavingTarget(null)
    }
  }

  const saveMatch = async () => {
    setSavingTarget('match')
    setMessage(null)
    try {
      const payload = toMatchPayload(matchForm)
      let result = matchForm.id
        ? await supabase.from('matches').update(payload).eq('id', matchForm.id)
        : await supabase.from('matches').insert([payload])

      if (result.error && isMissingColumnError(result.error)) {
        const basePayload = toBaseMatchPayload(matchForm)
        result = matchForm.id
          ? await supabase.from('matches').update(basePayload).eq('id', matchForm.id)
          : await supabase.from('matches').insert([basePayload])
      }

      if (result.error) throw result.error

      setMessage(
        matchForm.id
          ? '試合カードを更新しました。'
          : '試合カードを追加しました。試合順/メインカード保存にはSupabase migrationの適用が必要です。',
      )
      setMatchForm(emptyMatchForm)
      await loadAdminData()
    } catch (error) {
      setMessage(`試合カードの保存に失敗しました: ${getErrorMessage(error)}`)
    } finally {
      setSavingTarget(null)
    }
  }

  const importRizinFighters = async () => {
    setImportingRizin(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/import-rizin-fighters', { method: 'POST' })
      const result = (await response.json()) as {
        ok?: boolean
        imported?: number
        inserted?: number
        updated?: number
        message?: string
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? 'RIZIN import failed')
      }

      setMessage(
        `RIZIN公式から${result.imported ?? 0}名を取得しました。追加: ${result.inserted ?? 0} / 更新: ${
          result.updated ?? 0
        }`,
      )
      await loadAdminData()
    } catch (error) {
      setMessage(`RIZIN公式インポートに失敗しました: ${getErrorMessage(error)}`)
    } finally {
      setImportingRizin(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#E8002D]">Admin console</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">大会・試合カード管理</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#AAAAAA]">
              選手データに加えて、大会と試合カードを管理します。将来のスクレイピング取り込みにも流用しやすいよう、
              フォーム部品と保存処理を分けています。
            </p>
          </div>
          <Link
            href="/"
            className="w-fit rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition active:scale-95"
          >
            アプリへ戻る
          </Link>
        </header>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#E8002D]/30 bg-[#E8002D]/10 px-4 py-3 text-sm font-bold text-white">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-[2rem] border border-[#E8002D]/25 bg-[radial-gradient(circle_at_0%_0%,rgba(232,0,45,0.22),rgba(20,20,20,0.92)_44%)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">RIZIN crawler</p>
              <h2 className="mt-1 text-2xl font-black text-white">公式選手データ一括取得</h2>
              <p className="mt-2 text-sm leading-6 text-[#AAAAAA]">
                RIZIN公式MMA選手一覧から、選手名・写真・階級推定・プロフィール情報を取得してfightersへ反映します。
              </p>
            </div>
            <button
              type="button"
              onClick={importRizinFighters}
              disabled={importingRizin}
              className="min-h-14 rounded-2xl bg-[#E8002D] px-5 py-4 text-sm font-black text-white shadow-[0_18px_44px_rgba(232,0,45,0.28)] transition active:scale-[0.98] disabled:opacity-50"
            >
              {importingRizin ? '取得中...' : 'RIZIN公式から選手データを一括取得'}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-[#141414] p-10 text-center text-sm font-bold text-[#AAAAAA]">
            管理データを読み込み中...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <EventForm
              value={eventForm}
              events={events}
              isSaving={savingTarget === 'event'}
              onChange={setEventForm}
              onSubmit={saveEvent}
              onSelect={(event) => setEventForm(eventToFormValues(event))}
              onCreateNew={() => setEventForm(emptyEventForm)}
            />

            <MatchForm
              value={matchForm}
              events={events}
              fighters={fighters}
              matches={matches}
              isSaving={savingTarget === 'match'}
              onChange={setMatchForm}
              onSubmit={saveMatch}
              onSelect={(match) => setMatchForm(matchToFormValues(match))}
              onCreateNew={() => setMatchForm(emptyMatchForm)}
            />
          </div>
        )}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#141414] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#E8002D]">Relation preview</p>
              <h2 className="mt-1 text-2xl font-black text-white">Event → Match → Fighter</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-[#AAAAAA]">
              {matches.length} cards
            </span>
          </div>

          <div className="grid gap-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="grid gap-2 rounded-3xl border border-white/10 bg-black/40 p-4 text-sm md:grid-cols-[1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#666666]">
                    {eventNameById.get(match.event_id) ?? `Event #${match.event_id}`}
                    {match.bout_order ? ` / 第${match.bout_order}試合` : ''}
                    {match.is_main_card ? ' / Main card' : ''}
                  </p>
                  <p className="mt-1 text-base font-black text-white">
                    {match.fighter1?.name ?? `Fighter #${match.fighter1_id}`} vs{' '}
                    {match.fighter2?.name ?? `Fighter #${match.fighter2_id}`}
                  </p>
                </div>
                <p className="text-xs font-bold text-[#AAAAAA]">Match ID: {match.id}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
