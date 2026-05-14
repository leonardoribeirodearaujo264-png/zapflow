import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

const supabase = createClient(
  "https://ebviewqpdoumwgfmcfll.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmlld3FwZG91bXdnZm1jZmxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg4MjMxNiwiZXhwIjoyMDkyNDU4MzE2fQ.R7Lnck7xEI8W83o5qpZEmSevix2HByYwzKGPoNyVOdE"
)

const schema = readFileSync(join(process.cwd(), "supabase-schema.sql"), "utf-8")
console.log("Schema loaded, executing via Supabase...")
console.log("Please run supabase-schema.sql in your Supabase SQL editor at: https://supabase.com/dashboard/project/ebviewqpdoumwgfmcfll/sql/new")
