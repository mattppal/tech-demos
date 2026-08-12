import { Link, Route, Routes } from "react-router";

import { ComparePage } from "@/features/compare/compare-page";
import { IndexPage } from "@/features/index/index-page";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-[90rem] items-baseline justify-between px-6 py-4 sm:px-8">
          <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
            Writing&nbsp;Bench
          </Link>
          <p className="font-sans text-[0.6875rem] tracking-[0.14em] uppercase text-ink-muted">
            Cached one-turn harness outputs
          </p>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/compare/:benchmarkId/:promptId" element={<ComparePage />} />
        </Routes>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto w-full max-w-[90rem] px-6 py-6 sm:px-8">
          <p className="font-sans text-[0.6875rem] text-ink-muted">
            Outputs generated once via @cursor/sdk with tools disabled, then
            cached as fixtures. No live inference happens on this page.
          </p>
        </div>
      </footer>
    </div>
  );
}
