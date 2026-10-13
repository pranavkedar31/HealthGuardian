export default function Stat({ label, value, note, icon, trend }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
            {icon}
          </div>
        )}
      </div>
      {note && <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{note}</p>}
      {trend && <div className="mt-3 text-[11px] font-bold text-teal-700 dark:text-teal-400">{trend}</div>}
    </div>
  );
}
