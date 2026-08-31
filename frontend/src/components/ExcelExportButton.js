import Image from 'next/image';

export default function ExcelExportButton({ onClick, disabled, children = 'Export to Excel' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded bg-[#1d6f42] px-4 py-2 text-sm font-medium text-white hover:bg-[#175735] disabled:opacity-50"
    >
      <Image src="/excel-icon.svg" alt="" width={18} height={18} />
      {children}
    </button>
  );
}
