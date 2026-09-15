import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-bg text-fg font-sans selection:bg-accent selection:text-accent-fg">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border/40 bg-bg/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-fg font-display font-bold text-lg">C</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight">CuePay</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/pay" 
              className="text-sm font-medium text-muted hover:text-fg transition-colors"
            >
              Player Portal
            </Link>
            <Link
              to="/app"
              className="text-sm font-medium bg-surface hairline px-4 py-2 rounded-full hover:bg-elevated transition-colors"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-32 overflow-hidden felt-wash">
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Live in Nairobi & Mombasa
          </div>
          
          <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-tight">
            Unlock the Table. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-accent to-emerald-400">
              Play the Game.
            </span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            The premium hardware-software ecosystem for modern pool clubs.
            Automated IoT table locks, instant M-Pesa payments, and real-time manager analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/pay"
              className="w-full sm:w-auto px-8 py-4 bg-accent text-accent-fg font-semibold rounded-full hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(22,199,132,0.3)] hover:shadow-[0_0_30px_rgba(22,199,132,0.5)] transform hover:-translate-y-0.5"
            >
              Pay for a Game
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-surface hairline text-fg font-medium rounded-full hover:bg-elevated transition-colors"
            >
              How it works
            </a>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-bg border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Engineered for Club Owners</h2>
            <p className="text-muted max-w-xl mx-auto">
              We replace manual timers and cash leaks with airtight, hardware-enforced payment logic.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "IoT Table Locking",
                desc: "Balls are locked inside the table until a payment is confirmed. No payment, no play.",
                icon: (
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              },
              {
                title: "Instant M-Pesa",
                desc: "Players scan a QR code, pay via M-Pesa, and the table releases instantly via WebSockets.",
                icon: (
                  <svg className="w-6 h-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                title: "Real-Time Dashboard",
                desc: "Managers see live table statuses (Busy/Idle) and daily revenue collections from anywhere.",
                icon: (
                  <svg className="w-6 h-6 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )
              }
            ].map((f, i) => (
              <div key={i} className="bg-surface p-8 rounded-(--radius-xl) hairline group hover:bg-elevated transition-colors">
                <div className="w-12 h-12 bg-bg rounded-lg hairline flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold font-display mb-2">{f.title}</h3>
                <p className="text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-surface font-display font-bold text-xs">C</span>
            </div>
            <span className="font-display font-medium text-muted">CuePay © {new Date().getFullYear()}</span>
          </div>
          <p className="text-sm text-subtle">Building the future of club management.</p>
        </div>
      </footer>
    </div>
  );
}
