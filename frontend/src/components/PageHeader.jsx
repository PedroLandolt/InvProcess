export default function PageHeader({ title, action }) {
  return (
    <div className="px-4 md:px-8 py-3 bg-white border-b border-border-light flex justify-between items-center shrink-0 min-h-[50px]">
      <span className="text-sm font-semibold text-text-primary">{title}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-accent text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
