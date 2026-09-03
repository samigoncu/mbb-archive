"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();

    if (!query) {
      router.push("/arama");
      return;
    }

    // Yeni sorguda facet seçimleri ve sayfa sıfırlanır.
    router.push(`/arama?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="Belge başlığı veya içeriğinde ara…"
          aria-label="Belge arama"
          className="h-11 pl-9"
        />
      </div>
      <Button type="submit" size="lg" className="h-11">
        Ara
      </Button>
    </form>
  );
}
