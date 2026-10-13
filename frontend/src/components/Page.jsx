export default function Page({ title, subtitle, action, eyebrow="HealthGuardian", children }) {
  return (
    <main className="min-h-[calc(100vh-76px)] bg-[#f4f8f8] px-4 py-6 transition-colors duration-200 dark:bg-slate-950 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">{eyebrow}</p>
            <h1 className="page-title mt-1 text-3xl font-black tracking-tight text-slate-950 transition-colors duration-200 dark:text-white sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 transition-colors duration-200 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </main>
  );
}
