export default function OptionButton({ label, selected, onSelect, checkbox }) {
  return (
    <button onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
        selected ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] ${
        checkbox ? 'rounded-md' : 'rounded-full'
      } ${selected ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}>
        {selected ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}