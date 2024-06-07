import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRevalidator,
} from "@remix-run/react";
import { createBrowserClient  } from "@supabase/auth-helpers-remix";
import { json } from "@remix-run/node"
import { useEffect, useState } from "react";
import createServerSuperbase from "utils/supabase.server"
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "db_types"


type TypedSupabaseClient = SupabaseClient<Database>

export type SupabaseOutletContext = {
  supabase: TypedSupabaseClient
}

export const loader = async ({request}: LoaderArgs) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!
  }

  const response = new Response()
  const supabase = createServerSuperbase({request, response})
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return json({env, session}, {headers: response.headers})
}

export default function App() {

  const {env, session} = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()
  const [supabase] = useState(() => createBrowserClient<Database>(
    env.SUPABASE_URL, env.SUPABASE_ANON_KEY
  ))

  const serverAccessToken = session?.access_token
  // since useEffect runs client side, use singleton instance of superbase
  // declared above using supabase.auth
  useEffect(() => {
    const {data: {subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== serverAccessToken) {
        //call loaders
        revalidator.revalidate()
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, serverAccessToken, revalidator])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <p>Hi</p>
        <Outlet context={{ supabase }}/>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

//