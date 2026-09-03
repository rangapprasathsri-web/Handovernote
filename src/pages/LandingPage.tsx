import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock,
  Calendar,
  AlertTriangle,
  AlertCircle,
  FileText,
  ExternalLink,
  Shield,
  Layers,
  Activity,
  ChevronRight,
  Terminal,
  ArrowDown,
  X,
} from 'lucide-react';

export interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  onGetStarted,
  onOpenApp,
}) => {
  const [docModalOpen, setDocModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 antialiased">
      {/* 1. NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Logo & Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              <span className="font-mono">SF</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                ShiftFlow
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium tracking-wide text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200/60">
                Enterprise
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#product"
              className="hover:text-slate-900 transition-colors"
            >
              Product
            </a>
            <a
              href="#workflow"
              className="hover:text-slate-900 transition-colors"
            >
              Workflow
            </a>
            <a
              href="#features"
              className="hover:text-slate-900 transition-colors"
            >
              Features
            </a>
            <button
              type="button"
              onClick={() => setDocModalOpen(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Documentation
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="nav-signin-btn"
              onClick={onSignIn}
              className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              type="button"
              id="nav-getstarted-btn"
              onClick={onGetStarted}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-16 sm:pt-24 pb-16 lg:pb-24 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 flex flex-col items-start">
              <span className="text-[11px] font-semibold tracking-widest text-blue-700 uppercase mb-4 px-2 py-0.5 bg-blue-50 border border-blue-200/60 rounded">
                SHIFT HANDOVER MANAGEMENT
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-950 tracking-tight leading-[1.12] mb-6">
                Every shift ends.
                <br />
                <span className="text-slate-800">The context shouldn't.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-xl">
                ShiftFlow automatically turns shift activity into a clear, structured
                handover so the next team knows what happened, what is still active,
                and what requires attention.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="hero-getstarted-btn"
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#product"
                  id="hero-viewproduct-btn"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                >
                  View Product
                </a>
              </div>
            </div>

            {/* Right: Realistic Product Interface Screenshot Card */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Application Window Frame Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 tracking-tight">
                      Shift Handover Note
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Live Context</span>
                  </div>
                </div>

                {/* Shift Details Meta */}
                <div className="p-5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Shift Period</div>
                    <div className="text-sm font-bold text-slate-900">Morning Shift</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Window (UTC)</div>
                    <div className="text-sm font-mono font-medium text-slate-700">09:00 — 17:00</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Handover Lead</div>
                    <div className="text-sm font-medium text-slate-700">Alex Turner (Ops-1)</div>
                  </div>
                </div>

                {/* Grounded Sections */}
                <div className="p-5 space-y-4 bg-slate-50/30">
                  {/* 1. Completed */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-emerald-800 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Completed
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">1 item</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        OPS-102
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700">
                        Password reset issue resolved
                      </span>
                    </div>
                  </div>

                  {/* 2. In Progress */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-amber-800 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        In Progress
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">1 item</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        OPS-103
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700">
                        Payment investigation continues
                      </span>
                    </div>
                  </div>

                  {/* 3. Blockers */}
                  <div className="bg-white p-3.5 rounded-lg border border-rose-200/80 bg-rose-50/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-rose-800 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Blockers
                      </span>
                      <span className="text-[11px] font-mono text-rose-600 font-semibold">1 critical</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-semibold text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                        INC-201
                      </span>
                      <span className="text-xs sm:text-sm text-slate-800 font-medium">
                        Database response pending
                      </span>
                    </div>
                  </div>

                  {/* 4. Watch-list */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Watch-list
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">1 item</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        MON-401
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700">
                        CPU usage trending upward
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                  <span>Structured Handover Document</span>
                  <span className="font-mono text-[11px]">PDF / Markdown Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST SECTION */}
      <section className="py-12 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm font-medium text-slate-500 mb-6">
            Built for teams that depend on accurate operational context.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="text-sm font-semibold text-slate-900">Ticketing</span>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="text-sm font-semibold text-slate-900">Incident Management</span>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="text-sm font-semibold text-slate-900">Monitoring</span>
            </div>
            <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="text-sm font-semibold text-slate-900">Operations</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROBLEM SECTION */}
      <section className="py-20 border-b border-slate-200/60 bg-[#FBFBFA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left: Heading & Paragraph */}
            <div className="lg:col-span-6">
              <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-3 block">
                THE HANDOVER GAP
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug mb-6">
                Important information should not disappear between shifts.
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Operational activity is spread across tickets, incidents, alerts, and
                updates. When teams change, important context can be missed, duplicated,
                or manually reconstructed.
              </p>
            </div>

            {/* Right: Clean, Structured Timeline */}
            <div className="lg:col-span-6">
              <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-6">
                  Fragmented Shift Timeline
                </div>

                <div className="space-y-4 relative before:absolute before:left-14 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                  <div className="flex items-center gap-6 relative">
                    <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                      09:12
                    </span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 relative z-10"></span>
                    <span className="text-sm font-medium text-slate-800">
                      Ticket updated
                    </span>
                  </div>

                  <div className="flex items-center gap-6 relative">
                    <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                      10:45
                    </span>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 relative z-10"></span>
                    <span className="text-sm font-medium text-slate-800">
                      Incident escalated
                    </span>
                  </div>

                  <div className="flex items-center gap-6 relative">
                    <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                      12:30
                    </span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 relative z-10"></span>
                    <span className="text-sm font-medium text-slate-800">
                      Issue investigated
                    </span>
                  </div>

                  <div className="flex items-center gap-6 relative">
                    <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                      14:10
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 relative z-10"></span>
                    <span className="text-sm font-medium text-slate-800">
                      Alert resolved
                    </span>
                  </div>

                  <div className="flex items-center gap-6 relative">
                    <span className="font-mono text-xs font-semibold text-slate-500 w-10 text-right shrink-0">
                      16:25
                    </span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0 relative z-10"></span>
                    <span className="text-sm font-medium text-slate-800">
                      Monitoring warning
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SOLUTION SECTION */}
      <section className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-semibold tracking-widest text-blue-700 uppercase mb-2 block">
              TRANSFORMATION PIPELINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              One shift. One clear handover.
            </h2>
          </div>

          {/* Simple Transformation Diagram */}
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
            {/* Top Box: Operational Activity */}
            <div className="w-full max-w-xl bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Operational activity
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                  Tickets
                </span>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                  Incidents
                </span>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                  Alerts
                </span>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
                  Updates
                </span>
              </div>
            </div>

            {/* Down Indicator */}
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-px h-6 bg-slate-300"></div>
              <ArrowDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Middle Box: ShiftFlow */}
            <div className="px-8 py-4 bg-blue-600 text-white rounded-xl shadow-xs text-center border border-blue-700">
              <div className="text-sm font-bold tracking-tight">ShiftFlow</div>
              <div className="text-xs text-blue-100 font-mono">Deduplication &amp; State Normalizer</div>
            </div>

            {/* Down Indicator */}
            <div className="flex flex-col items-center justify-center text-slate-400">
              <div className="w-px h-6 bg-slate-300"></div>
              <ArrowDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Bottom Box: Structured Handover */}
            <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Structured handover
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs font-semibold">
                  Completed
                </span>
                <span className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-semibold">
                  In Progress
                </span>
                <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-semibold">
                  Blockers
                </span>
                <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-semibold">
                  Watch-list
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCT FEATURES */}
      <section id="features" className="py-20 bg-[#FBFBFA] border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-2 block">
              CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Purpose-built for mission-critical operations.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 01 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="font-mono text-xs font-bold text-blue-600 tracking-widest uppercase mb-3">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2 uppercase">
                Shift-based filtering
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Only activity from the selected shift is included.
              </p>
            </div>

            {/* Feature 02 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="font-mono text-xs font-bold text-blue-600 tracking-widest uppercase mb-3">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2 uppercase">
                Deduplicated updates
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Multiple updates to the same record become one meaningful handover item.
              </p>
            </div>

            {/* Feature 03 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="font-mono text-xs font-bold text-blue-600 tracking-widest uppercase mb-3">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2 uppercase">
                Source traceability
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every handover item links back to its original source.
              </p>
            </div>

            {/* Feature 04 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200/90 shadow-2xs">
              <div className="font-mono text-xs font-bold text-blue-600 tracking-widest uppercase mb-3">
                04
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-2 uppercase">
                Structured output
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Information is organized into Completed, In Progress, Blockers, and Watch-list.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. WORKFLOW SECTION */}
      <section id="workflow" className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-semibold tracking-widest text-blue-700 uppercase mb-2 block">
              EXECUTION PIPELINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              From activity to handover.
            </h2>
          </div>

          {/* Clean Horizontal Workflow with Thin Connecting Lines */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Step 1 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 relative">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">01</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Collect</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Operational events are collected from connected sources.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 relative">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">02</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Filter</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Only events inside the selected shift window are included.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 relative">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">03</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Consolidate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Duplicate updates are merged into meaningful records.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 relative">
              <div className="font-mono text-xs font-bold text-slate-400 mb-2">04</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Organize</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Events are classified by their operational state.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/30 relative">
              <div className="font-mono text-xs font-bold text-blue-600 mb-2">05</div>
              <h3 className="text-sm font-bold text-slate-900 mb-1.5">Deliver</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A structured handover is generated and exported.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRODUCT SHOWCASE */}
      <section id="product" className="py-20 bg-[#FBFBFA] border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-2 block">
              LIVE APPLICATION DASHBOARD
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
              Realistic operational dashboard.
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              No simulated fluff. True record IDs, timestamps, origin channels, and grounded operational state.
            </p>
          </div>

          {/* Large Realistic Dashboard Screenshot / Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Toolbar */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Shift Handover</h3>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Shift:</span>
                  <span className="font-medium text-slate-800">03 September 2026</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono font-medium text-slate-800">09:00 — 17:00</span>
                </div>
              </div>

              {/* Status Counts */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-medium">
                  Completed: 2 items
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-medium">
                  In Progress: 3 items
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-md font-medium">
                  Blockers: 1 item
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium">
                  Watch-list: 2 items
                </span>
              </div>
            </div>

            {/* Items Table / List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium text-xs">
                  <tr>
                    <th className="py-3 px-5 font-medium">Record ID</th>
                    <th className="py-3 px-5 font-medium">Short Description</th>
                    <th className="py-3 px-5 font-medium">State</th>
                    <th className="py-3 px-5 font-medium">Source</th>
                    <th className="py-3 px-5 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {/* Item 1 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">
                      OPS-102
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      Password reset service authentication failure resolved
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      ticketing-jira
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      11:42 UTC
                    </td>
                  </tr>

                  {/* Item 2 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">
                      TICK-884
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      CDN edge TLS cert rotation completed on staging
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      ops-changes
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      14:15 UTC
                    </td>
                  </tr>

                  {/* Item 3 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">
                      OPS-103
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      Payment gateway webhook latency investigation continues
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        In Progress
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      ticketing-jira
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      15:04 UTC
                    </td>
                  </tr>

                  {/* Item 4 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">
                      TICK-901
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      Elasticsearch shard reallocation underway
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        In Progress
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      infra-tasks
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      15:55 UTC
                    </td>
                  </tr>

                  {/* Item 5 */}
                  <tr className="hover:bg-rose-50/30">
                    <td className="py-3.5 px-5 font-mono font-semibold text-rose-900">
                      INC-201
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      Database response pending on replica cluster B failover
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        Blocker
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      incident-pagerduty
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      16:10 UTC
                    </td>
                  </tr>

                  {/* Item 6 */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-5 font-mono font-semibold text-slate-900">
                      MON-401
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      Worker pool CPU usage trending upward (&gt;82%)
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Watch-list
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      datadog-alerts
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 font-mono text-xs">
                      16:30 UTC
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Controls */}
            <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Displaying 6 consolidated records from 3 operational sources</span>
              <button
                type="button"
                onClick={onOpenApp}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer inline-flex items-center gap-1"
              >
                <span>Launch Live Generator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. WHY IT MATTERS */}
      <section className="py-20 bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-14">
            <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mb-2 block">
              OPERATIONAL IMPACT
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
              A good handover saves the next shift from starting over.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-t-2 border-slate-900 pt-6">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Less duplicated work
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Incoming engineers don't re-triage already diagnosed tickets or repeat investigations completed earlier in the day.
              </p>
            </div>

            <div className="border-t-2 border-slate-900 pt-6">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Faster response
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Critical blockers and live incident states are immediately visible upon shift change without 30 minutes of chat scrolling.
              </p>
            </div>

            <div className="border-t-2 border-slate-900 pt-6">
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Better operational continuity
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Grounded shift records provide a permanent audit trail for compliance, post-mortems, and engineering leadership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="py-24 bg-[#FBFBFA] border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 tracking-tight mb-4">
              Start the next shift with context.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 mb-8">
              Generate a structured handover from real operational activity.
            </p>
            <button
              type="button"
              id="cta-generatehandover-btn"
              onClick={onOpenApp}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>Generate Handover</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-200/80">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xs">
                  SF
                </div>
                <span className="font-bold text-slate-900 text-base">ShiftFlow</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Structured handovers for operational teams.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
              <a href="#product" className="hover:text-slate-900 transition-colors">
                Product
              </a>
              <button
                type="button"
                onClick={() => setDocModalOpen(true)}
                className="hover:text-slate-900 transition-colors cursor-pointer"
              >
                Documentation
              </button>
              <a
                href="mailto:support@shiftflow.internal"
                className="hover:text-slate-900 transition-colors"
              >
                Support
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <span>© 2026 ShiftFlow</span>
            <span>Enterprise Operations Software</span>
          </div>
        </div>
      </footer>

      {/* Clean Documentation Modal */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">ShiftFlow Documentation</h3>
              </div>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-4 text-xs sm:text-sm text-slate-600">
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Architecture &amp; Data Pipeline</h4>
                <p>
                  ShiftFlow connects directly to operational sources (Jira, PagerDuty, Datadog, Slack, and internal APIs). Events outside the specified window are filtered out. Duplicate event IDs are consolidated so each record displays its terminal operational state.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Grounding Standards</h4>
                <p>
                  Handover notes are categorized into four standardized buckets: Completed, In Progress, Blockers, and Watch-list. No unverified or hallucinated items are permitted.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">Export &amp; Archival</h4>
                <p>
                  Handovers export to formatted PDF documents or clean Markdown and automatically persist to cloud Firestore records for audit trail retention.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocModalOpen(false);
                  onOpenApp();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Launch Handover App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
