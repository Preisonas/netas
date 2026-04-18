import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import palmsBg from "@/assets/palms-bg.png";
import logo from "@/assets/logo.png";
import logoHero from "@/assets/logo-hero.gif";

const navItems = ["Home", "Shop", "Wiki", "Terms"];

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
            <img src={logo} alt="Dynamic Roleplay logo" className="h-9 w-9" />
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
            Sign in
          </Button>
        </header>

        {/* Hero */}
        <section className="container grid lg:grid-cols-2 gap-10 items-center pt-16 pb-28">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              JOIN{" "}
              <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">
                DYNAMIC ROLEPLAY
              </span>
              <br />
              AND CREATE YOUR STORY!
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Build dynamic stories in an interactive environment where only
              your creativity is the limit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm h-10 px-7">
                Play now
              </Button>
              <Button variant="outline" className="rounded-sm border-white/30 bg-transparent text-white/70 hover:bg-white/10 hover:text-white/90 h-10 px-10">
                Register Account
              </Button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <img
                src={logoHero}
                alt="Dynamic Roleplay logo"
                className="h-32 md:h-40 w-auto"
              />
            </div>
          </div>
        </section>

        {/* News */}
        <section className="container pb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-semibold">News and updates!</h2>
            <p className="text-muted-foreground mt-2">
              Stay up to date with all the news and updates from our server.
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
