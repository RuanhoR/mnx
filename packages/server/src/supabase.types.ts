export interface Database {
  public: {
    Tables: {
      user_table: {
        Row: {
          uid: number
          name: string
          mail: string
          ctime: string
          friends: number[]
          friends_request: number[]
          password: string
          avatar_url?: string
        }
        Insert: {
          name: string
          mail: string
          password: string
          avatar_url?: string
        }
        Update: {
          name?: string
          mail?: string
          password?: string
          avatar_url?: string
          friends?: number[]
          friends_request?: number[]
          uid?: never
          ctime?: never
        }
        Relationships: []
      }
      mnx_packages: {
        Row: {
          id: number
          name: string
          owner: number
          version: string
          readme: string
          file: string
          description: string
          scope: string
          created_at: string
          update_at: string
        }
        Insert: {
          name: string
          owner: number
          version: string
          readme: string
          file: string
          description: string
          scope: string
        }
        Update: {
          name?: string
          owner?: number
          version?: string
          readme?: string
          file?: string
          description?: string
          scope?: string
          update_at?: string
        }
        Relationships: []
      }
      mnx_scope: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      mnx_readme: {
        Row: {
          id: number
          content: string
          cout: number
        }
        Insert: {
          content: string
        }
        Update: {
          content?: string
        }
        Relationships: []
      }
    },
    Views: Record<string, never>,
    Functions: Record<string, never>
  }
}