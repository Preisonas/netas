import { Button } from "@/components/ui/button";
import palmsBg from "@/assets/palms-bg.png";
import logo from "@/assets/logo.png";
import logoHero from "@/assets/logo-hero.gif";
import news1 from "@/assets/news-1.png";
import news2 from "@/assets/news-2.png";
import news3 from "@/assets/news-3.png";
import mapBg from "@/assets/map-bg.png";
import { FolderOpen, ExternalLink } from "lucide-react";

const navItems = ["Pradžia", "Parduotuvė", "Wiki", "Taisyklės"];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background image — hero only */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen" aria-hidden>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${palmsBg})`,
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
          }}
        />
        <div
          className="absolute inset-0 bg-background/60"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 30%, transparent 95%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="relative z-10">
        {/* Nav */}
        <header className="container flex items-center justify-between py-6">
          <a href="#" className="flex items-center gap-2">
            <img src={logo} alt="Speed Roleplay logo" className="h-9 w-9" />
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item, i) => (
              <a
                key={item}
                href="#"
                className={`px-4 py-1.5 text-sm rounded-sm transition-colors ${
                  i === 0
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
          <Button className="rounded-sm bg-white text-black hover:bg-white/90 h-8 px-8">
            Prisijungti
          </Button>
        </header>

        {/* Hero */}
        <section className="container grid lg:grid-cols-2 gap-10 items-center pt-16 pb-28">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              PRISIJUNK PRIE{" "}
              <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                SPEED ROLEPLAY
              </span>
              <br />
              IR SUKURK SAVO ISTORIJĄ!
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Kurk savo istorijas mūsų mieste, kur tik tavo kūrybiškumas yra
              riba.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm h-10 px-7">
                Žaisti dabar
              </Button>
              <Button variant="outline" className="rounded-sm border-white/30 bg-transparent text-white/70 hover:bg-white/10 hover:text-white/90 h-10 px-10">
                Registruoti paskyrą
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src={logoHero}
                alt="Speed Roleplay logo"
                className="h-32 md:h-40 w-auto"
              />
            </div>
          </div>
        </section>

        {/* News */}
        <section className="container pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">Naujienos ir atnaujinimai!</h2>
            <p className="text-muted-foreground mt-2">
              Sek visas naujienas ir mūsų serverio atnaujinimus.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[news1, news2, news3].map((src, i) => (
              <article
                key={i}
                className="aspect-[4/3] rounded-lg overflow-hidden"
              >
                <img
                  src={src}
                  alt={`News ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </article>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section className="relative overflow-hidden">
          {/* Map background (left side) — clean blend, no masks */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[55%]"
            aria-hidden
          >
            <img
              src={mapBg}
              alt=""
              className="h-full w-full object-cover opacity-15"
            />
          </div>

          <div className="relative container grid lg:grid-cols-2 gap-12 items-center py-24">
            {/* Spacer for map column on desktop */}
            <div className="hidden lg:block" />

            {/* Steps */}
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Kaip pradėti žaisti Speed Roleplay
              </h2>
              <h3 className="text-2xl md:text-3xl font-bold leading-tight mt-1">
                Sek žingsnis po žingsnio ir sukurk savo istoriją!
              </h3>
              <p className="mt-5 text-muted-foreground">
                Speed Roleplay serveryje turi visišką laisvę kurti savo istoriją,
                bendrauti su kitais žaidėjais ir tapti tuo, kuo nori. Vienintelė
                riba — tavo kūrybiškumas! Sek žingsnius, kad teisingai
                prisijungtum prie serverio, o jei kils klausimų — kreipkis į mūsų
                pagalbos komandą.
              </p>

              <div className="mt-8 h-px bg-border/60" />

              {/* Step 1 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">1.</span>{" "}
                  Pirmas žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Įsidiek{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    MTA: San Andreas
                  </span>{" "}
                  į savo kompiuterį.
                  <br />
                  Jis būtinas norint prisijungti prie serverio.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-sm border-white/20 bg-secondary/40 text-foreground hover:bg-secondary/60 h-9 px-4 gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Įdiegti MTA
                </Button>
              </div>

              {/* Step 2 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">2.</span>{" "}
                  Antras žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Užregistruok paskyrą oficialioje{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    Speed Roleplay
                  </span>{" "}
                  svetainėje.
                  <br />
                  Ši paskyra bus naudojama prisijungti prie serverio.
                </p>
              </div>

              {/* Step 3 */}
              <div className="mt-8">
                <h4 className="text-lg font-semibold">
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">3.</span>{" "}
                  Trečias žingsnis
                </h4>
                <p className="mt-2 text-muted-foreground">
                  Spausk mygtuką žemiau, kad{" "}
                  <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent font-medium">
                    atvertum MTA
                  </span>{" "}
                  tiesiai mūsų serveryje.
                  <br />
                  Tada prisijunk su paskyra, kurią susikūrei svetainėje.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-sm border-white/20 bg-secondary/40 text-foreground hover:bg-secondary/60 h-9 px-4 gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Atverti MTA
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
