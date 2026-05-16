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
}

export interface Event {
  id: number
  name: string
  event_date: string
}

export interface Match {
  id: number
  event_id: number
  fighter1_id: number
  fighter2_id: number
  youtube_id: string | null
  fighter1: Fighter
  fighter2: Fighter
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
