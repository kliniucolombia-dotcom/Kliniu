type ContactItem = {
  label: string;
  value: string;
  href: string;
  icon: React.ReactNode;
};

export default function ContactBar({ items }: { items: ContactItem[] }) {
  return (
    <div className="grid grid-cols-2 [&>a]:border-b [&>a]:border-r [&>a]:border-black/8 [&>a:nth-child(2n)]:border-r-0 [&>a:nth-child(n+3)]:border-b-0 md:grid-cols-4 md:[&>a]:border-b-0 md:[&>a:nth-child(2n)]:border-r md:[&>a:nth-child(4n)]:border-r-0">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          rel={item.href.startsWith("http") ? "noreferrer" : undefined}
          className={`${item.href.includes("wa.me") ? "btn-whatsapp " : ""}interactive-lift flex flex-col items-center gap-2 px-4 py-5 text-center transition-colors hover:bg-[#f0f8f8]`}
        >
          <span className="text-[#27B1B8]">{item.icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6e7379]">
            {item.label}
          </span>
          <span className="text-sm font-bold text-[#0C535B]">{item.value}</span>
        </a>
      ))}
    </div>
  );
}
