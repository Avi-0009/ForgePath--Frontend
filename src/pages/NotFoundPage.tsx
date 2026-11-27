const NotFoundPage = () => (
  <div className="grid min-h-full place-items-center bg-app-bg px-5 py-10 text-app-text">
    <section className="w-full max-w-lg rounded-panel border border-app-line bg-app-panel p-6 text-center shadow-panel sm:p-8">
      <p className="text-micro font-bold uppercase tracking-eyebrow text-app-accent">
        404 / Route unavailable
      </p>
      <h1 className="mt-3 font-manrope text-2xl font-extrabold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-app-muted">
        The address does not match a ForgePath page, or the route is no
        longer available.
      </p>
      <a className="btn btn-primary mt-6" href="/">
        Return to dashboard
      </a>
    </section>
  </div>
);

export default NotFoundPage;
