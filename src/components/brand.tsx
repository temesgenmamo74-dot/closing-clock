import logo from "@/assets/eliphaz-logo.jpeg.asset.json";

export function Brand({ large = false }: { large?: boolean }) {
  return <div className="flex items-center gap-3"><img src={logo.url} alt="Eliphaz" className={large ? "h-24 w-24 rounded-lg object-contain" : "h-14 w-14 rounded-lg object-contain"} /><span className="font-display text-3xl font-bold">Eliphaz</span></div>;
}