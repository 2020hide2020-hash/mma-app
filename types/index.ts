export interface Fighter {
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
  created_at?: string
}

export interface Event {
  id: number
  name: string
  event_date: string
  logo_url?: string | null
  created_at?: string
}

export interface Match {
  id: number
  event_id: number
  fighter1_id: number
  fighter2_id: number
  youtube_id: string | null
  bout_order?: number | null
  is_main_card?: boolean | null
  created_at?: string
  fighter1: Fighter
  fighter2: Fighter
}

export interface EventFormValues {
  id?: number
  name: string
  event_date: string
  logo_url: string
}

export interface MatchFormValues {
  id?: number
  event_id: number | ''
  fighter1_id: number | ''
  fighter2_id: number | ''
  youtube_id: string
  bout_order: number | ''
  is_main_card: boolean
}

export interface PredictionRow {
  winner_fighter_id: number
  user_id: string
}

export type ActiveTab = 'prediction' | 'fighters' | 'articles' | 'mypage'

export interface VoteEffect {
  fighterName: string
  side: 'left' | 'right'
  nonce: number
}
