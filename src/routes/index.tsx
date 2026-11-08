import { createFileRoute } from "@tanstack/react-router";
import { WormGame } from "@/components/WormGame";
import { AssetLoader } from "@/components/AssetLoader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wormz — Garden Battle Arena" },
      { name: "description", content: "Choose your worm's skin, feast on fruit, and battle for the biggest worm in the arena." },
      { property: "og:title", content: "Wormz — Garden Battle Arena" },
      { property: "og:description", content: "Choose your worm's skin, feast on fruit, and battle for the biggest worm in the arena." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AssetLoader><WormGame /></AssetLoader>,
});
