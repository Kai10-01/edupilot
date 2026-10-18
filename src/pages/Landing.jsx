import { Link } from 'react-router-dom';
import { Building2, Eye, Globe2, Home, Landmark, LayoutDashboard, ReceiptText, ShieldCheck, Wallet } from 'lucide-react';
import { DemoBanner, Logo, StatusChip } from '../components/ui';
import { useAuth } from '../lib/store';

const CANVA_SITE = 'https://adsvb-s.my.canva.site/chief-technology-officer';

export default function Landing() {
  const { session } = useAuth();
  const appLink = session ? `/${session.profile.role}` : '/signup';

  return (
    <>
      <DemoBanner />
      <header className="hero">
        <nav className="landing-nav">
          <Logo />
          <div className="links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href={CANVA_SITE} target="_blank" rel="noreferrer">Our website</a>
          </div>
          <div className="spacer" />
          {session ? (
            <Link className="btn btn-primary btn-sm" to={appLink}>Open dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-outline btn-sm" to="/login">Log in</Link>
              <Link className="btn btn-navy btn-sm" to="/signup">Get Started</Link>
            </>
          )}
        </nav>

        <div className="hero-inner">
          <div>
            <h1>A simpler way to manage international education payments</h1>
            <p className="lead">
              One Semester Plan for tuition, approved accommodation and living allowances. Built for international
              students in Malaysia and their families, and linked to your university.
            </p>
            <div className="row wrap">
              <Link className="btn btn-navy" to={session ? appLink : '/login'}>
                {session ? 'Open my dashboard' : 'Try the live demo'}
              </Link>
              <a className="btn btn-outline" href={CANVA_SITE} target="_blank" rel="noreferrer">
                <Globe2 size={18} /> Visit our website
              </a>
            </div>
            <p className="small muted" style={{ marginTop: 16 }}>
              EduPilot never holds your money. Transfers are made by a licensed payment provider.
            </p>
          </div>

          <div className="card hero-card" aria-label="Example Semester Plan">
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Your Semester Plan</h3>
            {[
              ['Tuition fee', 'RM 18,000', 'completed', Building2, ''],
              ['Accommodation', 'RM 6,000', 'scheduled', Home, ''],
              ['Living allowance', 'RM 1,000 / month', 'planned', Wallet, 'green'],
            ].map(([label, amount, status, Icon, tone]) => (
              <div className="item" key={label}>
                <span className={`icon-bubble ${tone}`}><Icon size={20} /></span>
                <div className="spacer">
                  <div className="small muted">{label}</div>
                  <div className="bold">{amount}</div>
                </div>
                <StatusChip status={status} />
              </div>
            ))}
          </div>
        </div>
      </header>

      <section id="features" className="features">
        {[
          [Eye, 'Real-time payment tracking', 'Follow every payment from Initiated to Confirmed by the university, with live updates and timestamps.'],
          [LayoutDashboard, 'A simple dashboard', 'See what is due, what is paid and what is next, all in one Semester Plan.'],
          [ReceiptText, 'Transparent fees', 'See the full breakdown before you pay, and the same breakdown on your receipt.'],
          [ShieldCheck, 'Secure, verified payees', 'Invoices come straight from the university, so you never type in bank details.'],
        ].map(([Icon, title, text]) => (
          <div className="card feature" key={title}>
            <span className="icon-bubble"><Icon size={22} /></span>
            <h4>{title}</h4>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="card" style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {[
            ['For parents & sponsors', 'Who am I paying? What is it for? Has it arrived? EduPilot answers all three.'],
            ['For students', 'No more acting as the messenger. Your sponsor sees allowance releases, but never how you spend them.'],
            ['For universities', 'Every payment arrives with the invoice number and student ID, so there is less reconciliation and fewer "has my payment arrived?" emails.'],
          ].map(([title, text]) => (
            <div key={title}>
              <h4 style={{ marginBottom: 6 }}>{title}</h4>
              <p className="muted small" style={{ lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="section">
        <h2>Simple, transparent pricing</h2>
        <p className="muted">Transfer and exchange-rate fees are charged separately by the licensed payment provider and shown before you pay.</p>
        <div className="pricing">
          <div className="card">
            <span className="icon-bubble"><Wallet size={22} /></span>
            <h3 style={{ marginTop: 12 }}>Families</h3>
            <div className="price">RM129 <span className="small muted">/ Semester Plan</span></div>
            <p className="muted small">Planning, verified payment details, status tracking and allowance scheduling for one semester.</p>
          </div>
          <div className="card">
            <span className="icon-bubble navy"><Landmark size={22} /></span>
            <h3 style={{ marginTop: 12 }}>Universities</h3>
            <div className="price">RM2,000 <span className="small muted">/ month</span></div>
            <p className="muted small">Plus a one-off onboarding fee of RM8,000. Includes the payment-status dashboard and reconciliation tools.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        © 2026 EduPilot, a BFM3130 student project prototype. No real money is moved in this demo.
      </footer>
    </>
  );
}
