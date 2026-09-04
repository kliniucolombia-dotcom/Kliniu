import { formatearMoneda } from "../data/catalog";

/** Precio del combo con precio normal tachado y % de ahorro. */
export default function ComboPrice({
  price,
  normalPrice,
  className = "",
  priceClassName = "text-base font-bold text-[#0C535B]",
}: {
  price: number;
  normalPrice: number;
  className?: string;
  priceClassName?: string;
}) {
  const savings = normalPrice - price;
  const savingsPct = normalPrice > 0 ? (savings / normalPrice) * 100 : 0;
  const hasSavings = savings > 0;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {hasSavings && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8b8d91] line-through">{formatearMoneda(normalPrice)}</span>
          <span className="rounded-md bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold text-[#16A34A]">
            -{savingsPct.toFixed(0)}%
          </span>
        </div>
      )}
      <p className={priceClassName}>{formatearMoneda(price)}</p>
      {hasSavings && (
        <p className="text-[11px] font-semibold text-[#16A34A]">Ahorras {formatearMoneda(savings)}</p>
      )}
    </div>
  );
}
