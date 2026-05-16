import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const DEFAULT_PARAMS = {
  striking: 70,
  wrestling: 70,
  grappling: 70,
  cardio: 70,
  durability: 70,
  iq: 70,
  power: 70,
  submission: 70,
  stamina: 70,
  speed: 70,
  defense: 70,
}

const decodeHtml = (value: string) => {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

const stripTags = (value: string) =>
  decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const extractProfileValue = (html: string, label: string) => {
  const pattern = new RegExp(`<tr>\\s*<th>${label}：<\\/th>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`, 'i')
  const match = html.match(pattern)
  return match ? stripTags(match[1]) || null : null
}

const extractDescription = (html: string) => {
  const match = html.match(/<div class="profile_desc">([\s\S]*?)<\/div>/i)
  return match ? stripTags(match[1]) || null : null
}

const inferWeightClass = (weight: string | null) => {
  if (!weight) return null
  const kg = Number(weight.match(/(\d+(?:\.\d+)?)/)?.[1])
  if (!kg) return null
  if (kg <= 49) return 'スーパーアトム級'
  if (kg <= 53) return 'ストロー級'
  if (kg <= 57) return 'フライ級'
  if (kg <= 61.5) return 'バンタム級'
  if (kg <= 66.5) return 'フェザー級'
  if (kg <= 71) return 'ライト級'
  if (kg <= 77.5) return 'ウェルター級'
  if (kg <= 84.5) return 'ミドル級'
  if (kg <= 93.5) return 'ライトヘビー級'
  return 'ヘビー級'
}

const isMissingColumnError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : ''
  return message.includes('Could not find') || message.includes('column')
}

const extractName = (html: string) => {
  const profileName = extractProfileValue(html, '名前')?.split(/\s+/)[0]
  if (profileName) return profileName

  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
  return title ? stripTags(title).replace(/\s*-\s*RIZIN.*$/, '') : null
}

const extractImage = (html: string) => {
  return (
    html.match(/<div class="img_box">\s*<img src="([^"]+)"/i)?.[1] ??
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ??
    null
  )
}

const toBasePayload = (payload: ReturnType<typeof buildPayload>) => ({
  name: payload.name,
  image_url: payload.image_url,
  organization: payload.organization,
  weight_class: payload.weight_class,
  gym: payload.gym,
  record: payload.record,
  base_style: payload.base_style,
  style_tags: payload.style_tags,
  striking: payload.striking,
  wrestling: payload.wrestling,
  grappling: payload.grappling,
  cardio: payload.cardio,
  durability: payload.durability,
  iq: payload.iq,
  power: payload.power,
})

const buildPayload = (html: string) => {
  const name = extractName(html)
  if (!name) throw new Error('選手名を抽出できませんでした')

  const weight = extractProfileValue(html, '体重')
  const affiliation = extractProfileValue(html, '所属')

  return {
    name,
    image_url: extractImage(html),
    organization: 'RIZIN',
    weight_class: inferWeightClass(weight),
    gym: affiliation,
    record: null,
    base_style: 'MMA',
    style_tags: ['RIZIN', 'MMA'],
    birthplace: extractProfileValue(html, '出身地'),
    birth_date: extractProfileValue(html, '生年月日'),
    height: extractProfileValue(html, '身長'),
    weight,
    affiliation,
    twitter_url: null,
    instagram_url: null,
    youtube_url: null,
    description: extractDescription(html),
    ...DEFAULT_PARAMS,
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string }
    if (!body.url) throw new Error('URLを入力してください')

    const url = new URL(body.url)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('http/https URLを入力してください')
    }

    const response = await fetch(url.toString(), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; KakutouOSBot/1.0)' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`ページ取得に失敗しました: ${response.status}`)
    }

    const html = await response.text()
    const payload = buildPayload(html)

    const { data: existingData, error: existingError } = await supabase
      .from('fighters')
      .select('id,name')
      .eq('name', payload.name)
      .maybeSingle()

    if (existingError) throw existingError

    let result = existingData?.id
      ? await supabase.from('fighters').update(payload).eq('id', existingData.id)
      : await supabase.from('fighters').insert([payload])

    if (result.error && isMissingColumnError(result.error)) {
      const basePayload = toBasePayload(payload)
      result = existingData?.id
        ? await supabase.from('fighters').update(basePayload).eq('id', existingData.id)
        : await supabase.from('fighters').insert([basePayload])
    }

    if (result.error) throw result.error

    return NextResponse.json({
      ok: true,
      name: payload.name,
      updated: Boolean(existingData?.id),
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown import error' },
      { status: 500 },
    )
  }
}
