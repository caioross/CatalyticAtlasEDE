import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <div className="font-mono text-2xs uppercase tracking-widest text-accent-rose">404</div>
      <h1 className="mt-2 text-3xl font-semibold text-ink-100">Enzyme not found</h1>
      <p className="mt-3 text-ink-300">
        The entry you requested is not in the catalog. It may have been renamed, removed, or never added.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md border border-accent-cyan bg-accent-cyan/10 px-4 py-2 text-sm text-accent-cyan hover:bg-accent-cyan/20"
      >
        Back to catalog
      </Link>
    </div>
  );
}
