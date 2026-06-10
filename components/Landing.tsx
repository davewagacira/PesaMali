'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { I } from './Icons'

const FEATURES = [
  { icon: 'target', title: 'Safe-to-spend, daily', desc: 'Know exactly how much you can spend today without breaking your budget — recalculated in real time.' },
  { icon: 'chart', title: 'Live analytics', desc: 'Watch your spending patterns unfold with clean charts that actually make sense at a glance.' },
  { icon: 'sparkles', title: 'AI money coach', desc: 'Ask anything about your finances and get clear, personal guidance — no jargon, no judgment.' },
  { icon: 'trophy', title: 'Streaks & achievements', desc: 'Turn good habits into a game. Build momentum and stay motivated to keep saving.' },
  { icon: 'shield', title: 'Private & secure', desc: 'Your data is encrypted and protected with MFA. Your money story stays yours, always.' },
  { icon: 'zap', title: 'Effortless logging', desc: 'Log an expense in seconds with quick categories and smart defaults built for real life.' },
]

const STEPS = [
  { n: '01', icon: 'plusCircle', title: 'Log your spending', desc: 'Add expenses in a tap. Quick categories make it effortless to stay on top of every shilling.' },
  { n: '02', icon: 'barChart', title: 'See the insight', desc: 'Akiba instantly turns your transactions into safe-to-spend numbers and live analytics.' },
  { n: '03', icon: 'sprout', title: 'Build better habits', desc: 'Stay on pace with streaks, nudges, and an AI coach that keeps you moving forward.' },
]

export default function Landing() {
  const router = useRouter()
  const login = () => router.push('/auth')
  const signup = () => router.push('/auth?mode=signup')
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lp">
      {/* ===== Header ===== */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Akiba" />
            <span className="lp-brand-copy">
              <b>Akiba</b>
              <small>Smart money moves.</small>
            </span>
          </div>
          <nav className="lp-nav-links">
            <a href="#features" onClick={scrollTo('features')}>Why Akiba</a>
            <a href="#how" onClick={scrollTo('how')}>How it works</a>
          </nav>
          <div className="lp-nav-actions">
            <button className="lp-btn lp-btn-ghost" onClick={login}>Log in</button>
            <button className="lp-btn lp-btn-primary" onClick={signup}>Get started</button>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="lp-hero">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />

        <motion.div
          className="lp-hero-copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="lp-badge"><I n="sparkles" size={14} /> AI-powered money clarity</span>
          <h1>
            Turn everyday spending into <span className="lp-grad">financial intelligence</span>.
          </h1>
          <p>
            Akiba transforms your daily transactions into real-time insight — helping you understand
            your money, adjust faster, and build stronger financial habits with AI-guided clarity.
          </p>
          <div className="lp-cta-row">
            <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={signup}>
              Get started free <I n="trendUp" size={16} />
            </button>
            <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={login}>Log in</button>
          </div>
          <div className="lp-trust">
            <I n="check" size={14} /> No card required · Built for Kenyan students
          </div>
        </motion.div>

        {/* Floating dashboard mockup */}
        <motion.div
          className="lp-hero-visual"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <motion.div
            className="lp-mock"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="lp-mock-label"><span className="lp-dot" /> Safe to spend today</div>
            <div className="lp-mock-amount"><span className="lp-cur">KES</span> 1,240</div>
            <div className="lp-mock-bar"><span style={{ width: '68%' }} /></div>
            <div className="lp-mock-meta">
              <span>68% of daily pace used</span>
              <span className="lp-mock-ok">On track</span>
            </div>
            <div className="lp-mock-tx">
              {[
                { ic: 'utensils', name: 'Lunch — Mama Oliech', amt: '−420' },
                { ic: 'bus', name: 'Matatu fare', amt: '−80' },
                { ic: 'phone', name: 'Airtime top-up', amt: '−100' },
              ].map((t) => (
                <div className="lp-tx-row" key={t.name}>
                  <span className="lp-tx-ic"><I n={t.ic} size={15} /></span>
                  <span className="lp-tx-name">{t.name}</span>
                  <span className="lp-tx-amt">{t.amt}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="lp-chip lp-chip-1"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <I n="flame" size={15} /> 12-day streak
          </motion.div>
          <motion.div
            className="lp-chip lp-chip-2"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <I n="trendDown" size={15} /> 18% under budget
          </motion.div>
        </motion.div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Why Akiba</span>
          <h2>Everything you need to master your money</h2>
          <p>Simple tools, serious clarity. Built to fit the way you actually spend.</p>
        </div>
        <div className="lp-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              className="lp-feature"
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            >
              <div className="lp-feature-ic"><I n={f.icon} size={20} /></div>
              <b>{f.title}</b>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="lp-section lp-steps-section">
        <div className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>From spending to smart in three steps</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <motion.div
              className="lp-step"
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="lp-step-top">
                <span className="lp-step-num">{s.n}</span>
                <span className="lp-step-ic"><I n={s.icon} size={20} /></span>
              </div>
              <b>{s.title}</b>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== CTA band ===== */}
      <section className="lp-cta-band">
        <div className="lp-cta-inner">
          <h2>Start making smart money moves today.</h2>
          <p>Join Akiba and turn your spending into a financial advantage — free to begin.</p>
          <div className="lp-cta-row lp-cta-center">
            <button className="lp-btn lp-btn-light lp-btn-lg" onClick={signup}>
              Create your free account <I n="trendUp" size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="lp-footer">
        <div className="lp-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Akiba" />
          <span className="lp-brand-copy">
            <b>Akiba</b>
            <small>Smart money moves.</small>
          </span>
        </div>
        <span className="lp-footer-copy">© {new Date().getFullYear()} Akiba · Smart money moves.</span>
      </footer>
    </div>
  )
}
