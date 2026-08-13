import { Link, Route, Routes } from "react-router";

import { ComparePage } from "@/features/compare/compare-page";
import { IndexPage } from "@/features/index/index-page";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="wb-double-rule">
        <div className="mx-auto flex w-full max-w-[96rem] items-baseline justify-between px-6 py-4 sm:px-10">
          <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
            Writing&nbsp;Bench
          </Link>
          <p className="hidden font-serif text-[0.875rem] italic text-ink-muted sm:block">
            Model prose, read side by side
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
        <div className="mx-auto w-full max-w-[96rem] px-6 py-7 sm:px-10">
          <p className="text-center font-serif text-[0.8125rem] italic text-ink-faint">
            Generated once via @cursor/sdk with tools disabled, then cached —
            no live inference on this page.
          </p>
        </div>
      </footer>
    </div>
  );
}
