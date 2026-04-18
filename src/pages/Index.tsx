import { Button } from "@/components/ui/button";
import palmsBg from "@/assets/palms-bg.png";
import logo from "@/assets/logo.png";
import logoHero from "@/assets/logo-hero.gif";
import news1 from "@/assets/news-1.png";
import news2 from "@/assets/news-2.png";
import news3 from "@/assets/news-3.png";

const navItems = ["Pradžia", "Parduotuvė", "Wiki", "Taisyklės"];

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${palmsBg})` }}
        aria-hidden
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/60" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" aria-hidden />

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
                className="aspect-[4/3] rounded-lg border border-border/60 bg-card/40 backdrop-blur overflow-hidden hover:border-primary/50 transition-colors"
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
      </div>
    </div>
  );
};

export default Index;
