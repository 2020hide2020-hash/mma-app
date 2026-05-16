import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const RIZIN_JSON_URL = 'https://jp.rizinff.com/json/fighters-mma.json'
const DEFAULT_PARAMS = {
  striking: 60,
  grappling: 85,
  submission: 70,
  stamina: 75,
  power: 65,
  speed: 70,
  defense: 75,
}

interface RizinListGroup {
  fighters?: RizinListFighter[]
}

interface RizinListFighter {
  name?: string
  english_name?: string
  tag?: string
  img_src?: string
}

interface ImportedFighter {
  name: string
  image_url: string | null
  organization: string
  weight_class: string | null
  gym: string | null
  record: string | null
  base_style: string
  style_tags: string[]
  birthplace: string | null
  birth_date: string | null
  height: string | null
  weight: string | null
  affiliation: string | null
  twitter_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  description: string | null
  striking: number
  grappling: number
  submission: number
  stamina: number
  power: number
  speed: number
  defense: number
  wrestling: number
  cardio: number
  durability: number
  iq: number
}

interface RizinDetail {
  image_url?: string | null
  birthplace?: string | null
  birth_date?: string | null
  height?: string | null
  weight?: string | null
  affiliation?: string | null
  twitter_url?: string | null
  instagram_url?: string | null
  youtube_url?: string | null
  description?: string | null
  weight_class?: string | null
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

const stripTags = (value: string) => decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
  .replace(/\s+/g, ' ')
  .trim()

const extractProfileValue = (html: string, label: string) => {
  const pattern = new RegExp(`<tr>\\s*<th>${label}：<\\/th>\\s*<td>([\\s\\S]*?)<\\/td>\\s*<\\/tr>`, 'i')
  const match = html.match(pattern)
  return match ? stripTags(match[1]) || null : null
}

const extractProfileLink = (html: string, label: string) => {
  const pattern = new RegExp(`<tr>\\s*<th>${label}：<\\/th>\\s*<td>[\\s\\S]*?<a\\s+href="([^"]+)"`, 'i')
  const match = html.match(pattern)
  return match ? decodeHtml(match[1]) : null
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

const fetchDetail = async (tag: string): Promise<RizinDetail> => {
  const url = `https://jp.rizinff.com/_tags/${encodeURIComponent(tag)}`
  const response = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; KakutouOSBot/1.0)' },
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) return {}
  const html = await response.text()
  const detailImage = html.match(/<div class="img_box">\s*<img src="([^"]+)"/i)?.[1] ?? null
  const weight = extractProfileValue(html, '体重')

  return {
    image_url: detailImage,
    birthplace: extractProfileValue(html, '出身地'),
    birth_date: extractProfileValue(html, '生年月日'),
    height: extractProfileValue(html, '身長'),
    weight,
    affiliation: extractProfileValue(html, '所属'),
    twitter_url: extractProfileLink(html, 'Twitter'),
    instagram_url: extractProfileLink(html, 'Instagram'),
    youtube_url: extractProfileLink(html, 'YouTube'),
    description: extractDescription(html),
    weight_class: inferWeightClass(weight),
  }
}

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const toBaseFighterPayload = (fighter: ImportedFighter) => ({
  name: fighter.name,
  image_url: fighter.image_url,
  organization: fighter.organization,
  weight_class: fighter.weight_class,
  gym: fighter.gym,
  record: fighter.record,
  base_style: fighter.base_style,
  style_tags: fighter.style_tags,
  striking: fighter.striking,
  wrestling: fighter.wrestling,
  grappling: fighter.grappling,
  cardio: fighter.cardio,
  durability: fighter.durability,
  iq: fighter.iq,
  power: fighter.power,
})

const isMissingColumnError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String(error.message)
        : ''
  return message.includes('Could not find') || message.includes('column')
}

export async function POST() {
  try {
    const response = await fetch(RIZIN_JSON_URL, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; KakutouOSBot/1.0)' },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`RIZIN JSON fetch failed: ${response.status}`)
    }

    const groups = (await response.json()) as RizinListGroup[]
    const listFighters = groups.flatMap((group) => group.fighters ?? []).filter((fighter) => fighter.name)
    const imported: ImportedFighter[] = []

    for (const group of chunk(listFighters, 8)) {
      const detailedGroup = await Promise.all(
        group.map(async (fighter) => {
          const detail = fighter.tag ? await fetchDetail(fighter.tag) : {}
          const imageUrl = detail.image_url ?? fighter.img_src ?? null
          return {
            name: fighter.name ?? '',
            image_url: imageUrl,
            organization: 'RIZIN',
            weight_class: detail.weight_class ?? null,
            gym: detail.affiliation ?? null,
            record: null,
            base_style: 'MMA',
            style_tags: ['RIZIN', 'MMA'],
            birthplace: detail.birthplace ?? null,
            birth_date: detail.birth_date ?? null,
            height: detail.height ?? null,
            weight: detail.weight ?? null,
            affiliation: detail.affiliation ?? null,
            twitter_url: detail.twitter_url ?? null,
            instagram_url: detail.instagram_url ?? null,
            youtube_url: detail.youtube_url ?? null,
            description: detail.description ?? null,
            ...DEFAULT_PARAMS,
            wrestling: 75,
            cardio: 75,
            durability: 75,
            iq: 70,
          }
        }),
      )
      imported.push(...detailedGroup)
    }

    const names = imported.map((fighter) => fighter.name)
    const { data: existingData, error: existingError } = await supabase
      .from('fighters')
      .select('id,name')
      .in('name', names)

    if (existingError) throw existingError

    const existingByName = new Map((existingData ?? []).map((fighter) => [fighter.name, fighter.id]))
    const inserts = imported.filter((fighter) => !existingByName.has(fighter.name))
    const updates = imported.filter((fighter) => existingByName.has(fighter.name))

    if (inserts.length > 0) {
      let insertResult = await supabase.from('fighters').insert(inserts)
      if (insertResult.error && isMissingColumnError(insertResult.error)) {
        insertResult = await supabase.from('fighters').insert(inserts.map(toBaseFighterPayload))
      }
      if (insertResult.error) throw insertResult.error
    }

    for (const fighter of updates) {
      const id = existingByName.get(fighter.name)
      let updateResult = await supabase.from('fighters').update(fighter).eq('id', id)
      if (updateResult.error && isMissingColumnError(updateResult.error)) {
        updateResult = await supabase.from('fighters').update(toBaseFighterPayload(fighter)).eq('id', id)
      }
      if (updateResult.error) throw updateResult.error
    }

    return NextResponse.json({
      ok: true,
      imported: imported.length,
      inserted: inserts.length,
      updated: updates.length,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Unknown import error' },
      { status: 500 },
    )
  }
}
