"use client";

import { useEffect, useState } from "react";

type ContactItem = {
  label: string;
  value: string;
  href: string;
  icon: React.ReactNode;
};

const ASESORES = ["573112088806", "573226556454", "573105750449"];

function formatPhone(phone: string) {
  const country = phone.slice(0, 2);
  const rest = phone.slice(2);
  return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
}

export default function ContactBar({ items }: { items: ContactItem[] }) {
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    setPhone(ASESORES[Math.floor(Math.random() * ASESORES.length)]);
  }, []);

  const resolved = items.map((item) => {
    if (!phone) return item;
    if (item.label === "Llámanos") {
      return { ...item, value: formatPhone(phone), href: `tel:+${phone}` };
    }
    if (item.label === "WhatsApp") {
      return { ...item, value: formatPhone(phone), href: `https://wa.me/${phone}` };
    }
    return item;
  });

  return (
    <div className="grid grid-cols-2 [&>a]:border-b [&>a]:border-r [&>a]:border-black/8 [&>a:nth-child(2n)]:border-r-0 [&>a:nth-child(n+3)]:border-b-0 md:grid-cols-4 md:[&>a]:border-b-0 md:[&>a:nth-child(2n)]:border-r md:[&>a:nth-child(4n)]:border-r-0">
      {resolved.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target={item.href.startsWith("http") ? "_blank" : undefined}
          rel={item.href.startsWith("http") ? "noreferrer" : undefined}
          className="interactive-lift flex flex-col items-center gap-2 px-4 py-5 text-center transition-colors hover:bg-[#f0f8f8]"
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
