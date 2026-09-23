"use client";

import { useEffect, useState } from "react";
import { readPublishedChallenges } from "@/lib/draft-storage";
import type { PublishedChallenge } from "@/types/challenge";

export function useCatalog() {
  const [items, setItems] = useState<PublishedChallenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    function load() {
      if (!active) return;
      try { setItems(readPublishedChallenges()); setError(""); }
      catch { setError("Could not read this browser’s saved challenges. Check browser storage and refresh. Your data has not been changed."); }
      setLoaded(true);
    }
    Promise.resolve().then(load);
    window.addEventListener("storage", load);
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("storage", load); window.removeEventListener("focus", load); };
  }, []);
  return { items, loaded, error };
}
