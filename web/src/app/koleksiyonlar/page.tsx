import { Star } from "lucide-react";
import { Notice, PageHeader } from "@/components/ui/page";
import { getCollections } from "@/features/collections/api/get-collections";
import { CollectionBoard } from "@/features/collections/components/collection-board";

export const metadata = { title: "Koleksiyonlar" };

export default async function KoleksiyonlarPage() {
  const { items, error } = await getCollections();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Koleksiyonlar"
        description="Belgeleri fiziksel klasörlerinden taşımadan konu, iş veya denetim bazında gruplayın."
      />

      <Notice icon={Star}>
        Koleksiyon sanal bir gruplamadır. Bir belge birden fazla koleksiyonda
        yer alabilir; kopya oluşmaz ve belgenin dosya planındaki yeri değişmez.
      </Notice>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-6 text-center">
          <p className="text-sm font-medium">Koleksiyonlar listelenemedi</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <CollectionBoard collections={items} />
      )}
    </div>
  );
}
