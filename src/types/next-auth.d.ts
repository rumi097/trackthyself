import "next-auth"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      identifier: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    identifier: string
  }
}
