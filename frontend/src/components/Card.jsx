export default function Card({ title, subtitle, children, className="", action, accent=false }) {
  return (
    <section className={`surface-card relative overflow-hidden ${className}`}>
      {accent && (
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400" />
      )}
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="card-title text-base font-extrabold text-slate-950 transition-colors duration-200 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500 transition-colors duration-200 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
