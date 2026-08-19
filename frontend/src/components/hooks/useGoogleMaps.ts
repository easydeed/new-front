"use client"

/**
 * The Places loader — one of them, resolving deterministically.
 *
 * ═══ THE REGRESSION THIS FIXES, AND IT WAS MINE ═══
 *
 * HOME2 (#223) deleted the Google Maps `<Script>` from `layout.tsx` on a
 * rationale I wrote: "REDUNDANT, not merely misplaced — `useGoogleMaps`
 * creates its own tag." The first half was true of the HOOK and false of
 * the ROUTE. **Nothing called this hook.** It was defined here, imported
 * nowhere, and the builder's address search depended entirely on the tag
 * in the layout.
 *
 * So property autofill died in production: `window.google` never
 * appeared, `isGoogleLoaded` stayed false, the debounce effect bailed at
 * `if (!isGoogleLoaded) return`, and the officer typed into a field that
 * ignored her — with no error, because a bail is not a failure.
 *
 * §14.5, exactly: checking that a change is correct is not checking what
 * depends on it. The removal was verified against the hook's source and
 * never against the consumer's render path, and "every consumer already
 * loads it on demand" is a claim about callers that nobody counted.
 *
 * ═══ WHY THIS RESOLVES RATHER THAN POLLS ═══
 *
 * `PropertySection` used to look for `window.google` at mount and once
 * more at 1s. A script that arrived at 1.2s was missed permanently, and
 * the layout tag hid that by loading earlier than either check. A loader
 * whose success depends on winning a race is a loader that works on the
 * reviewer's machine.
 *
 * Every path here ends in a definite state: `ready` when the API is
 * usable, `unavailable` with a REASON when it cannot be, `loading` only
 * while a script is genuinely in flight.
 *
 * ═══ AND WHY IT ADOPTS AN EXISTING TAG ═══
 *
 * Two components may want Places on one page (`PropertySearch` loads its
 * own). Appending a second script for the same API is how you get
 * "google.maps.places is already defined" and a silent no-op, so this
 * looks for a tag first and waits on ITS load event rather than racing
 * it.
 */

import { useEffect, useState } from "react"

export type PlacesStatus = "loading" | "ready" | "unavailable"

const SCRIPT_ID = "google-maps-places"
const SRC_MATCH = "maps.googleapis.com/maps/api/js"

export interface PlacesLoad {
  status: PlacesStatus
  /** Present only when `status === 'unavailable'`, and always a sentence. */
  reason?: string
  /** True only when the services below are usable. Kept for call sites
   *  that read a boolean, and derived rather than tracked separately. */
  isGoogleLoaded: boolean
  autocompleteService: google.maps.places.AutocompleteService | null
  placesService: google.maps.places.PlacesService | null
}

const NO_KEY =
  "Address lookup is not configured on this deployment, so suggestions are "
  + "unavailable. Enter the address manually — nothing else on this page "
  + "depends on it."

const LOAD_FAILED =
  "Address lookup could not be reached, so suggestions are unavailable. "
  + "Enter the address manually and continue — the county search still works."

export function useGoogleMaps(onError?: (error: string) => void): PlacesLoad {
  const [status, setStatus] = useState<PlacesStatus>("loading")
  const [reason, setReason] = useState<string | undefined>()
  const [autocompleteService, setAutocompleteService] =
    useState<google.maps.places.AutocompleteService | null>(null)
  const [placesService, setPlacesService] =
    useState<google.maps.places.PlacesService | null>(null)

  useEffect(() => {
    let cancelled = false

    const ready = () => {
      if (cancelled) return
      if (!window.google?.maps?.places) {
        // The script loaded and the library is still absent — a wrong
        // `libraries=` parameter, or a key rejected after load. Reported
        // rather than left as a permanent "loading".
        fail(LOAD_FAILED)
        return
      }
      setAutocompleteService(new window.google.maps.places.AutocompleteService())
      // PlacesService requires a node; it never enters the document.
      setPlacesService(
        new window.google.maps.places.PlacesService(document.createElement("div")))
      setStatus("ready")
    }

    const fail = (message: string) => {
      if (cancelled) return
      setStatus("unavailable")
      setReason(message)
      onError?.(message)
    }

    if (typeof window === "undefined") return

    if (window.google?.maps?.places) {
      ready()
      return
    }

    // A tag already in the document — adopt it rather than adding a
    // second one for the same API.
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src*="${SRC_MATCH}"]`)
    if (existing) {
      existing.addEventListener("load", ready)
      existing.addEventListener("error", () => fail(LOAD_FAILED))
      return () => {
        cancelled = true
        existing.removeEventListener("load", ready)
      }
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
    if (!apiKey) {
      // A missing key is a DEPLOY fact, not a user error, and it is the
      // one failure the officer can do nothing about. It still gets a
      // sentence, because a silent dead field is worse.
      fail(NO_KEY)
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.addEventListener("load", ready)
    script.addEventListener("error", () => fail(LOAD_FAILED))
    document.head.appendChild(script)

    return () => {
      cancelled = true
      script.removeEventListener("load", ready)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    reason,
    isGoogleLoaded: status === "ready",
    autocompleteService,
    placesService,
  }
}
