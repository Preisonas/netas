import { Button } from "@/components/ui/button";
import { Play, ImageIcon } from "lucide-react";
import palmsBg from "@/assets/palms-bg.png";

const navItems = ["Home", "Loja", "Wiki", "Termos"];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 blur-sm"
        style={{ backgroundImage: `url(${palmsBg})` }}
        aria-hidden
      />
      {/* Blur + dark overlay */}
      <div className="absolute inset-0 bg-black/70" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black" aria-hidden />

      <div className="relative z-10">
        {/* Nav */}
        <header className="container flex items-center justify-between py-6">
          <a href="#" className="flex items-center gap-2 text-primary">
            <Play className="h-6 w-6 fill-primary" />
          </a>
          <nav className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-2 py-1 backdrop-blur">
            {navItems.map((item, i) => (
              <a
                key={item}
                href="#"
                className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                  i === 0
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
          <Button variant="outline" className="rounded-md border-border/70 bg-card/40 backdrop-blur">
            Entrar
          </Button>
        </header>

        {/* Hero */}
        <section className="container grid lg:grid-cols-2 gap-10 items-center pt-16 pb-28">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              JUNTE-SE AO{" "}
              <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                DYNAMIC ROLEPLAY
              </span>
              <br />
              E CRIE A SUA HISTORIA!
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Crie historias dinâmicas em um ambiente interativo onde so a sua
              criatividade é o limite.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-primary/90 text-primary-foreground hover:bg-primary rounded-md">
                Jogar agora
              </Button>
              <Button size="lg" variant="outline" className="rounded-md border-border/70 bg-transparent">
                Registar Conta
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute -inset-10 bg-primary/20 blur-3xl rounded-full" aria-hidden />
              <div className="relative font-bold text-center">
                <div className="text-6xl md:text-7xl tracking-tighter text-foreground drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
                  DYNAMIC
                </div>
                <div className="text-4xl md:text-5xl italic bg-[image:var(--gradient-brand)] bg-clip-text text-transparent -mt-2">
                  Roleplay
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* News */}
        <section className="container pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">Novidade e atualizações!</h2>
            <p className="text-muted-foreground mt-2">
              Acompanhe todas as noticias novidade e atualizações do nosso servidor.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <article
                key={i}
                className="aspect-[4/3] rounded-lg border border-border/60 bg-card/40 backdrop-blur flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
